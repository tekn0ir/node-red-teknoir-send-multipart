// // Get cached GPS location
// let location = flow.get('location', msg.payload.location);
// if (location === undefined) {
//     location = {"lat":"N/A","lng":"N/A"};
// }
//
// function toMLObjects(predictions) {
//     var MLObjects = [];
//     for (let i = 0; i < predictions.length; i++) {
//         var L = (predictions[i].bbox[0] * 800).toFixed();
//         var T = (predictions[i].bbox[1] * 600).toFixed();
//         var R = (predictions[i].bbox[2] * 800).toFixed();
//         var B = (predictions[i].bbox[3] * 600).toFixed();
//
//         MLObjects.push({
//             "Label": predictions[i].className,
//             "Probability": predictions[i].score * 100,
//             "Coordinates": "L:" + L + ", T:" + T + ", R:" + R + ", B:" + B
//         })
//     }
//     return MLObjects;
// }
//
// Date.prototype.dateToISO8601String  = function() {
//     var padDigits = function padDigits(number, digits) {
//         return Array(Math.max(digits - String(number).length + 1, 0)).join(0) + number;
//     }
//     var offsetMinutes = this.getTimezoneOffset();
//     var offsetHours = offsetMinutes / 60;
//     var offset= "Z";
//     if (offsetHours < 0)
//         offset = "-" + padDigits(offsetHours.replace("-","") + "00",4);
//     else if (offsetHours > 0)
//         offset = "+" + padDigits(offsetHours  + "00", 4);
//
//     return this.getFullYear()
//         + "-" + padDigits((this.getUTCMonth()+1),2)
//         + "-" + padDigits(this.getUTCDate(),2)
//         + "T"
//         + padDigits(this.getUTCHours(),2)
//         + ":" + padDigits(this.getUTCMinutes(),2)
//         + ":" + padDigits(this.getUTCSeconds(),2)
//         + offset;
//
// }
//
// var date = new Date();
//
// var payload = {
//     "DeviceID": "jetson-nano-one",
//     "RecordID": msg._msgid,
//     "DeviceModel": "N/A",
//     "EventDateTime": date.dateToISO8601String(),
//     "GPSLatitude": location.lat,
//     "GPSLongitude":location.lng,
//     "Temperature": 0.0,
//     "MLModel": "N/A",
//     "MLObjects": toMLObjects(msg.payload.objects)
// };
//
// var image = msg.payload.image;
// var buffer = Buffer.from(image.split(",")[1], 'base64').toString();
//
// msg.headers = {
//     "Content-Type": "multipart/form-data; boundary=------------------------d74496d66958873e"
// }
//
//
// msg.payload = '--------------------------d74496d66958873e\r\n'+
//     'Content-Disposition: form-data; name="payload"\r\n'+
//     'Content-Type: application/json\r\n'+
//     '\r\n'+
//     JSON.stringify(payload)+'\r\n'+
//     '--------------------------d74496d66958873e\r\n'+
//     'Content-Disposition: form-data; name="imagefile"; filename="imagefile.jpg"\r\n'+
//     'Content-Type: image/jpeg\r\n'+
//     //    'Content-Transfer-Encoding: base64\r\n'+
//     '\r\n'+
//     buffer.toString()+'\r\n'+
//     '--------------------------d74496d66958873e--\r\n';
//
//
// return msg;




// Get cached GPS location
let location = flow.get('location', msg.payload.location);
if (location === undefined) {
    location = {"lat":"N/A","lng":"N/A"};
}
var now = new Date();
var image = msg.payload;
var buffer = Buffer.from(image.split(",")[1], 'base64').toString();
msg.payload = {
    "imagefile": {
        "options": {
            "filename": "imagefile.jpg",
            "contentType": "image/jpeg",
            "knownLength": buffer.length
        },
        "value": buffer
    },
    "payload": {
        "options": {
            "contentType": "application/json"
        },
        "value": JSON.stringify({
            "DeviceID": "jetson-nano-one",
            "RecordID": msg._msgid,
            "DeviceModel": "jetson-nano",
            "EventDateTime": now.toISOString().split('.')[0]+"Z",
            "GPSLatitude": location.lat,
            "GPSLongitude": location.lng,
            "Temperature": 82.0,
            "MLModel": "test",
            "MLObjects": toMLObjects(msg.payload.objects)
        })
    },
};

return msg;