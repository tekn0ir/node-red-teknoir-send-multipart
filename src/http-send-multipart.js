// require in libs
var mustache = require('mustache');
var request = require('request');

var FormData = require('form-data');

module.exports = function (RED) {

    function httpSendMultipart(n) {
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
                if (this.credentials && this.credentials.user) {
                    var urlTail = url.substring(url.indexOf('://') + 3); // hacky but it works. don't judge me
                    var username = this.credentials.user,
                        password = this.credentials.password;
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
                        // msg.headers['x-node-red-request-node'] = hashSum(msg.headers);
                        // msg.url = url;   // revert when warning above finally removed
                        // if (node.metric()) {
                        //     // Calculate request time
                        //     var diff = process.hrtime(preRequestTimestamp);
                        //     var ms = diff[0] * 1e3 + diff[1] * 1e-6;
                        //     var metricRequestDurationMillis = ms.toFixed(3);
                        //     node.metric("duration.millis", msg, metricRequestDurationMillis);
                        //     if (res.client && res.client.bytesRead) {
                        //         node.metric("size.bytes", msg, res.client.bytesRead);
                        //     }
                        // }

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
                    // console.log(err)
                    // // remove sending status
                    // node.status({});
                    //
                    // //Handle error
                    // if (err || !resp) {
                    //     // node.error(RED._("httpSendMultipart.errors.no-url"), msg);
                    //     var statusText = "Unexpected error";
                    //     if (err) {
                    //         statusText = err;
                    //     } else if (!resp) {
                    //         statusText = "No response object";
                    //     }
                    //     node.status({
                    //         fill: "red",
                    //         shape: "ring",
                    //         text: statusText
                    //     });
                    // }
                    // msg.payload = body;
                    // msg.statusCode = resp.statusCode || resp.status;
                    // msg.headers = resp.headers;
                    // msg.formData = formData;
                    //
                    // if (node.ret !== "bin") {
                    //     msg.payload = body.toString('utf8'); // txt
                    //
                    //     if (node.ret === "obj") {
                    //         try {
                    //             msg.payload = JSON.parse(body);
                    //         } catch (e) {
                    //             node.warn(RED._("httpSendMultipart.errors.json-error"));
                    //         }
                    //     }
                    // }
                    //
                    // node.send(msg);
                });

            }

        }); // end of on.input

    } // end of httpSendMultipart fxn

    // Register the Node
    RED.nodes.registerType("http-send-multipart", httpSendMultipart, {
        credentials: {
            user: {
                type: "text"
            },
            password: {
                type: "password"
            }
        }
    });

};