module.exports = function (RED) {
    "use strict";
    var mustache = require('mustache');
    var request = require('request');

    function HTTPSendMultipart(n) {
        // Setup node
        RED.nodes.createNode(this, n);
        var node = this;

        this.ret = n.ret || "txt"; // default return type is text
        if (RED.settings.httpRequestTimeout) {
            this.reqTimeout = parseInt(RED.settings.httpRequestTimeout) || 60000;
        } else {
            this.reqTimeout = 60000;
        }

        // 1) Process inputs to Node
        this.on("input", function (msg,nodeSend,nodeDone) {
            // var preRequestTimestamp = process.hrtime();

            // Load 'url' parameter from node and try msg as failover
            var nodeUrl = n.url;
            if (!nodeUrl) {
                nodeUrl = msg.url;
            }
            var isTemplatedUrl = (nodeUrl || "").indexOf("{{") != -1;

            // Object extend
            function extend(target) {
                var sources = [].slice.call(arguments, 1);
                sources.forEach(function (source) {
                    for (var prop in source) {
                        target[prop] = source[prop];
                    }
                });
                return target;
            }

            // TODO: add ability to select other input types (not just files)

            // Look for filepath - // TODO improve logic

            if (!msg.payload) {
                // throw an error if no formData
                node.warn(RED._("Error: no form data found to send."));
                msg.error = "Form data was not defined";
                msg.statusCode = 400;
                node.send(msg); // TODO: make sure this escapes entirely; need better error-handling here
            } else {
                node.status({
                    fill: "blue",
                    shape: "dot",
                    text: "Sending multipart request..."
                });
                var url = nodeUrl; // TODO add ability to take this from the settings.js config file
                if (isTemplatedUrl) {
                    url = mustache.render(nodeUrl, msg);
                }
                if (!url) {
                    node.error(RED._("httpSendMultipart.errors.no-url"), msg);
                    node.status({
                        fill: "red",
                        shape: "ring",
                        text: (RED._("httpSendMultipart.errors.no-url"))
                    });
                    return;
                }

                // Add auth if it exists
                if (n.user && n.password) {
                    var urlTail = url.substring(url.indexOf('://') + 3); // hacky but it works. don't judge me
                    var username = n.user,
                        password = n.password;
                    if (url.indexOf("https") >= 0) {
                        url = 'https://' + username + ':' + password + '@' + urlTail;
                    } else {
                        url = 'http://' + username + ':' + password + '@' + urlTail;
                    }
                }

                const formData = {}
                for (const [key, value] of Object.entries(msg.payload)) {
                    formData[key] = {
                        value: value.value,
                        options: value.options
                    };
                }

                request.post({url: url, formData: formData}, function optionalCallback(err, res, body) {
                    if (err) {
                        if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
                            node.error(RED._("common.notification.errors.no-response"), msg);
                            node.status({fill: "red", shape: "ring", text: "common.notification.errors.no-response"});
                        } else {
                            node.error(err, msg);
                            node.status({fill: "red", shape: "ring", text: err.code});
                        }
                        msg.payload = err.toString() + " : " + url;
                        msg.statusCode = err.code;
                        nodeSend(msg);
                        nodeDone();
                    } else {
                        msg.statusCode = res.statusCode;
                        msg.headers = res.headers;
                        msg.responseUrl = res.request.uri.href;
                        msg.payload = body;
                        // msg.redirectList = redirectList;

                        if (msg.headers.hasOwnProperty('set-cookie')) {
                            msg.responseCookies = extractCookies(msg.headers['set-cookie']);
                        }

                        // Convert the payload to the required return type
                        if (node.ret !== "bin") {
                            msg.payload = msg.payload.toString('utf8'); // txt

                            if (node.ret === "obj") {
                                try {
                                    msg.payload = JSON.parse(msg.payload);
                                } // obj
                                catch (e) {
                                    node.warn(RED._("httpin.errors.json-error"));
                                }
                            }
                        }
                        node.status({});
                        nodeSend(msg);
                        nodeDone();
                    }
                });

            }

        }); // end of on.input

    } // end of httpSendMultipart fxn

    // Register the Node
    RED.nodes.registerType("http-send-multipart", HTTPSendMultipart);
};