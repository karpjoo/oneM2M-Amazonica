/**
 * Copyright (c) 2019, Human-Centric Smart Infrastructure Research Center, Konkuk University, Seoul, Korea
 * All rights reserved.
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * 3. The name of the author may not be used to endorse or promote products derived from this software without specific prior written permission.
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Created by Karpjoo Jeong on 2019-11-15.
 */

// NSEsys.js

const mqtt = require('mqtt');
const http = require('http');
const assert = require('assert');

const CustomUtil = require('../Commons/CustomUtil');
const Directory = require('../Commons/Directory');
const Primitive = require('../DataTypes/Primitive');
const EVENT = require('../Resources/Event');

// Base Class for Network Service Entity
class NSEsys {
    constructor(nse_config) {
        this.cse_id = nse_config.cse_id;
        this.ae_id = nse_config.ae_id;
    }
}

// Class for mqtt binding
class mqttNSE extends NSEsys {
    constructor(nse_config) {
        // nse_config : { 'cse_id' : , 'ae_id' :, 'protocol' : , 'bodytype' : , 'broker' : [ ip, port ]}
        super(nse_config);

        // configuration
        this.protocol = 'mqtt';
        this.bodytype = nse_config.bodytype;
        this.broker = CustomUtil.deep_clone(nse_config.broker);
        this.mqtt_url = "mqtt://" + this.broker[0] + ":" + this.broker[1];

        // mqtt broker
        this.mqtt = null;
        this.connected = false;

        // topics
        this.topics = {};

        // handlers
        // this.callback_table = {};
        // this.notification_table = {};
        // this.handlers = new HandlerDirectory();
        this.m2m_callback_dir = new Directory('CallbackDirectory');
        this.notification_dir = new Directory('NotificationDirectory');

        // security
        this.security = false;

        // callbacks and handlers
        this.message_handler = (topic, message) => {
            // console.log('\n\n-- message_handler:', topic, '\n', JSON.parse(message.toString()));
            try {
                switch (topic.split('/')[2]) {
                    case 'resp': this.callback_handler(topic, message); break;
                    case 'req_resp': this.callback_handler(topic, message); break;
                    case 'req': this.notification_handler(topic, message); break;
                    default: throw new Error([9000, 'message_handler: wrong topic']);
                }
            } catch (err) {
                console.log('\n\n**** Error (message_handler): ', err);
            }
        }

        this.callback_handler = (topic, message) => {
            try {
                var resp = JSON.parse(message.toString());
                // console.log('\n\n-- callback_handler:', topic, '\n', JSON.stringify(resp, null, 2));
                const rqi = resp.rqi;
                // let callback = this.handlers.find_callback(rqi);
                // this.handlers.deregister_callback(rqi);
                let callback = this.m2m_callback_dir.key_to_value(rqi);
                this.m2m_callback_dir.delete_item(rqi);
                callback(resp);
            } catch (err) { console.log(err); }
        }

        this.notification_handler = (topic, message) => {
            var resp = JSON.parse(message.toString());
            // console.log('\n\n-- notification_handler:', topic, '\n', JSON.stringify(resp, null, 2));
            var sub_sid = resp['pc']['m2m:sgn']['nev']['sur'];
            var noti_obj = resp['pc']['m2m:sgn']['nev']['rep'];
            try {
                // noti_entry == [type, handler]
                let noti_type=undefined, noti_handler=undefined;
                // ESUB sid, not EE sid !
                // let noti_entry = this.notification_dir.get_value(CustomUtil.psid(sub_sid));
                let noti_entry = this.notification_dir.key_to_value(CustomUtil.psid(sub_sid));
                if (noti_entry == undefined) {
                    if(noti_obj.hasProperty('m2m:sub')) console.log('\n\n----- SUB resource is created, but handler is not yet registered -----\n');
                    else throw [9000, 'NSEsys.notification_hander: handler not found'];
                } else [noti_type, noti_handler] = noti_entry;
                // if sub is esi noti handler && message is noti, then invoke handler
                // of if sub is m2m noti handler && message is m2m, then invoke handler
                switch(noti_type) {
                    case 'esi' : {
                        if(!noti_obj.hasOwnProperty('m2m:cin')) {
                            console.log('\n\n----- Resource other than m2m:cin one is created for notification -----\n');
                            break;       
                        }               
                        let noti_attrs = noti_obj['m2m:cin'];
                        let is_event = ((noti_attrs.ty == 4) && noti_attrs.hasOwnProperty('lbl') && noti_attrs.lbl.includes('esi'));
                        if(is_event) noti_handler(noti_attrs.con); 
                        break;
                    }
                    case 'm2m' : noti_handler(noti_obj); break;
                    default: throw [9000, 'NSEsys.notification_handler: unknown noti_type'];
                }
            } catch (err) { console.log(err); }
        }
        //
        this.register_callback = (rqi, callback) => { 
            this.m2m_callback_dir.add_item(rqi, callback); 
        }
        this.register_notification = (ee_id, handler, type) => { this.notification_dir.add_item(ee_id, [type, handler]); }
        this.deregister_notification = (ee_id) => { this.notification_dir.delete_item(ee_id); }
    };

    start() {
        var prom = this.connect();
        return prom.then((res) => { this.set_topics(); return Promise.resolve(res) },
            (err) => { return Promise.reject(err); });
    }

    //
    connect() {
        return new Promise((resolve, reject) => {
            try {
                // this.mqtt = mqtt.connect(options);
                this.mqtt = mqtt.connect(this.mqtt_url);
                this.mqtt.on('message', this.message_handler);
                this.mqtt.on('error', () => { console.log('MQTT error'); });
                this.mqtt.on('disconnect', () => { console.log('MQTT disconnected'); });
                this.mqtt.on('reconnect', () => { console.log('MQTT reconnected'); });
            } catch (err) {
                reject('mqtt connect failed !');
            }
            this.mqtt.on('connect', () => {
                console.log('MQTT now connected');
                // this.mqtt.on('disconnected', () => { })
                this.connected = true;
                resolve('MQTT now connected !');
            });
        });
    }

    set_topics() {
        if (!this.connected) throw Error('mqtt is not connected !');
        var originator = this.ae_id;
        var receiver = this.cse_id;
        // if receiver == '/wdc' then modify receiver to 'wdc'
        if (receiver.split('')[0] == '/') { receiver = receiver.split('').slice(1).join(''); }

        // set up the names of the topics
        this.topics.req = '/oneM2M/req/' + originator + '/' + receiver + '/' + this.bodytype;
        this.topics.resp = '/oneM2M/resp/' + originator + '/' + receiver + '/#'; // subscribe
        this.topics.reg_req = '/oneM2M/reg_req/' + originator + '/' + receiver + '/' + this.bodytype;
        this.topics.reg_resp = '/oneM2M/reg_resp/' + originator + '/' + receiver + '/#'; // subscribe
        this.topics.noti = '/oneM2M/req/' + receiver + '/' + originator + '/#'; // subscribe
        this.topics.ack = '/oneM2M/resp/' + receiver + '/' + originator + '/' + this.bodytype; // publish

        // subscribe to the topics 
        this.mqtt.subscribe(this.topics.resp);
        this.mqtt.subscribe(this.topics.reg_resp);
        this.mqtt.subscribe(this.topics.noti);
    }
    // when AE-ID is reset
    reset_topics() {
        if (!this.connected) throw Error('mqtt is not connected !');

        this.mqtt.unsubscribe(this.topics.resp);
        this.mqtt.unsubscribe(this.topics.reg_resp);
        this.mqtt.unsubscribe(this.topics.noti);

        this.set_topics();
    }

    request(reqPrim) {
        // console.log('\n\n----- NSE.request -----\n', JSON.stringify(reqPrim, null, 2));
        return new Promise((resolve, reject) => {
            this.register_callback(reqPrim.content.rqi, (resp) => {
                let respPrim = new Primitive ('m2m:rsp', resp);
                resolve(respPrim);
            });
            this.mqtt.publish(this.topics.req, reqPrim.serialize());
        });
    }
    //
}

// Class for http binding
class httpNSE extends NSEsys {
    constructor(nse_config) {
        super(nse_config);
        this.protocol = 'http';
        this.bodytype = bt;
        this.host = nse_config.host;
    }
}

module.exports = {
    "mqttNSE": mqttNSE,
    "httpNSE": httpNSE
};
