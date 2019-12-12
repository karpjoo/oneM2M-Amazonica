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

// const config = require('config');
const shortid = require('shortid');

const CustomUtil = require('../Commons/CustomUtil');
const Directory = require('../Commons/Directory');

const CSEsys = require('../Systems/CSEsys');

const SAE = require('../Resources/SAE');
const EE = require('../Resources/EE');
const ESUB = require('../Resources/ESUB');
const CIN = require('../Resources/CIN');
const CNT = require('../Resources/CNT');
const SUB = require('../Resources/SUB');
const Event = require('../Resources/Event');

const EventMessage = require('../DataTypes/EventMessage');

// 
class SAEsys {
    // --------- constructor ---------
    constructor(config) {
        // IDs for SAE
        // var base_id = config.sae.app + '_' + shortid.generate(); // make a temporary ae id for testing
        var base_id = config.sae.id;
        this.ID = {
            'cse': config.cse.id, // /wdc
            'ae': 'S' + base_id, // SP-relative AE-ID
            'par_sid': config.resource.root, // Structured ID of the parent (i.e., the root resource ID)
            'rsr_name': base_id,    // Resource name
            'full_sid': (config.resource.root + '/' + base_id),
            'callback_sid': (config.resource.root + '/' + base_id + '/esi_callback'),
            // 'prv_sub': (config.resource.root + '/' + base_id + '/esi_request/esi_callback')
        };
        this.ID.notification_url = `mqtt://${config.nse.mqtt.host}/${this.ID.ae}`;

        // configuration for CSE
        this.cse_sys = new CSEsys({
            "cse_id": this.ID.cse, // SP-relative CSE-ID. "/" + id
            'ae_id': this.ID.ae, // SP-relative AE-ID: 'S' + id. Or, CSE-ID + / + 'C' + CSE-assigned relative ID
            'csebase': config.resource.root,
            'nse_config': {
                'protocol': config.nse.protocol,
                'bodytype': config.nse.bodytype,
                'broker': [config.nse.mqtt.host, config.nse.mqtt.port]
            }
        });

        // SAE 
        this.sae = undefined;

        // Service & Function Directoris
        this.service_dir = new Directory('ServiceDirectory');
        this.function_dir = new Directory('FunctionDirectory');
        this.esi_callback_dir = new Directory('CallbackDirectory');

        // // Resource Directory
        // this.resource_dir = new Directory('ResourceDirectory');
        this.response_handler = (evt_msg) => {
            try {
                let evt_message = EventMessage.build(evt_msg);
                if (evt_message.type() != 'esi:rsp') throw new Error([9000, 'event message type is not response']);
                let resp_handler = this.find_response_handler(evt_message.eid());
                this.esi_callback_dir.delete_item(evt_message.eid());
                resp_handler(evt_msg);
            } catch (err) { console.log(err); }
        }
        this.register_response_handler = (evt_id, handler) => { this.esi_callback_dir.add_item(evt_id, handler); }
        this.find_response_handler = (evt_id) => { return this.esi_callback_dir.key_to_value(evt_id); }
        this.deregister_response_handler = (evt_id) => { this.esi_callback_dir.delete_item(evt_id); }
    }
    // --------- initialize ---------
    async initialize() {
        try {
            var connected = await this.cse_sys.start();

            // create SAE resource
            var sae_tmp = new SAE(this.ID.full_sid);
            this.sae = await this.cse_sys.create_resource(sae_tmp);
            // console.log('\n\n----- SAEsys.initialize (SAE) -----\n', JSON.stringify(this.sae, null, 2));

            // create callback EE
            var cb_ee = await this.create_callbackEE();
            // console.log('\n\n----- SAEsys.initialize (callback EE) -----\n', JSON.stringify(cb_ee, null, 2));

            process.on('exit', async (code) => {
                console.log('\n\n----- on exit, start to terminate !!!! ----\n');
            });
            process.on('SIGINT', async (code) => {
                console.log('\n\n----- received Control-C !!!! ----\n');
                var flushed_sae = await this.terminate();
                console.log('\n\n----- about to terminate !!!! ----\n', JSON.stringify(flushed_sae, null, 2));  
                process.exit(code);            
            });

            // return SAE resource
            return Promise.resolve(this.sae);
        } catch (err) { 
            console.log('Error in SAEsys.initialize');
            return Promise.reject([9000, 'SAE.initialize', CustomUtil.file_line(new Error())]); 
        }
    }
    // --------- restart ---------
    async restart(func_list) {
        try {
            var connected = await this.cse_sys.start();

            // recover the function directory
            // func_list.forEach( (func) => { this.function_dir.add_item(func[0], func[1]); } );
            func_list.forEach( (func) => { this.register_Function(func[0], func[1]); } );
            this.register_Function('esi_callback', this.response_handler);

            // retrieve SAE resource
            this.sae = await this.cse_sys.retrieve_resource(this.ID.full_sid);
            var servList = this.sae.services();
            // console.log('\n\n----- restart (SAE) ----\n', servList);

            // recover service directory
            servList.forEach( (serv) => { 
                // let ee_cur = await this.cse_sys.retrieve_resource(serv[1]);
                // ee_cur.set_active();
                // let ee_updated = await this.cse_sys.update_resource(ee_cur);
                this.register_Service(serv[0], serv[1]);
            });

            process.on('exit', async (code) => {
                console.log('\n\n----- on exit, start to terminate !!!! ----\n');
            });
            process.on('SIGINT', async (code) => {
                console.log('\n\n----- received Control-C !!!! ----\n');
                var flushed_sae = await this.terminate();
                console.log('\n\n----- about to terminate !!!! ----\n', JSON.stringify(flushed_sae, null, 2));  
                process.exit(code);            
            });
        } catch (err) { 
            console.log('Error in SAEsys.restart');
            return Promise.reject([9000, 'SAE.initialize', CustomUtil.file_line(new Error())]); 
        }
    }
    async terminate() {
        this.sae.set_services(this.service_dir.generate_pairs());
        this.sae.set_state('terminated');
        return this.cse_sys.update_resource(this.sae);
    }

    // --------- create_EE ---------
    // Event Entity management functions
    async create_EE(ee_sid, attrs) {
        try {
            // console.log('\n\n-- SAE.create_EE:', parent, ee_name);
            // return this.cse_sys.create_CNT({ 'to': parent, 'fr': this.ID.ae_id }, { 'rn': ee_name, 'lbl': ['azn:dEE', 'azn:active'] });
            var ee_tmp = new EE(ee_sid, attrs);
            return this.cse_sys.create_resource(ee_tmp);
        } catch (err) { 
            console.log('Error in SAEsys.create_EE');
            return Promise.reject([9000, err]); 
        }
    }
    async create_staticEE(ee_sid, sae_list) {
        try {
            var ee_tmp = new EE(ee_sid);
            ee_tmp.set_static(sae_list);
            return this.cse_sys.create_resource(ee_tmp);
        } catch (err) { 
            console.log('Error in SAEsys.create_staticEE');
            return Promise.reject([9000, err]); 
        }
    }
    async create_dedicatedEE(ee_sid, servName) {
        return this.create_serviceEE(ee_sid, servName, 'dedicated');
    }
    async create_responsiveEE(ee_sid, servName) {
        return this.create_serviceEE(ee_sid, servName, 'responsive');
    }
    async create_serviceEE(ee_sid, servName, resp_flag) {   
        try {
            // create EE
            var ee_tmp = new EE(ee_sid);
            if(resp_flag == 'responsive') ee_tmp.set_responsive(this.ID.ae);
            else ee_tmp.set_dedicated(this.ID.ae);
            var ee_rsr = await this.cse_sys.create_resource(ee_tmp);

            // register service
            this.register_Service(servName, ee_sid);

            // create Event-enabled SUB
            var es_tmp = new ESUB(ee_sid);
            es_tmp.set_notification_url(this.ID.notification_url);
            var es_rsr = await this.cse_sys.create_resource(es_tmp);

            return Promise.resolve(ee_rsr);
        } catch (err) { 
            console.log('\n\n----- ERROR in SAEsys.create_serviceEE -----\n', err); return Promise.reject([9000, err]); 
        }
    }
    async create_callbackEE() {
        try {
            // create EE
            var ee_rsr = await this.create_staticEE(this.ID.callback_sid, [this.ID.ae]);
            console.log('\n\n----- SAEsys.create_callbackEE (EE) -----\n', JSON.stringify(ee_rsr, null, 2));

            // register response handler
            this.register_Function('esi_callback', this.response_handler);
            this.register_Service('esi_callback', this.ID.callback_sid);

            // create Event-enabled SUB
            var es_tmp = new ESUB(this.ID.callback_sid);
            es_tmp.set_notification_url(this.ID.notification_url);
            var es_rsr = await this.cse_sys.create_resource(es_tmp);
            console.log('\n\n----- SAEsys.create_callbackEE (ESUB) -----\n', JSON.stringify(es_rsr, null, 2));

            return Promise.resolve(ee_rsr);
        } catch (err) { 
            console.log('\n\n----- ERROR in SAEsys.create_callbackEE -----\n', err); return Promise.reject([9000, err]); 
        }
    }

    async enable_Service(ee_sid, servName) {
        try {
            var ee_rsr = await this.cse_sys.retrieve_resource(ee_sid);
            // if (!ee_rsr.is_active())
            //     return Promise.reject([9000, ee_sid + ' is inactive', CustomUti.file_line(new Error(''))]);
            if (ee_rsr.is_static() && !ee_rsr.subs().includes(this.ID.ae))
                return Promise.reject([9000, 'unauthorized subscription to static EE by' + this.ID.ae, CustomUti.file_line(new Error(''))]);
    
            // register service
            this.register_Service(servName, ee_sid);
    
            let es_tmp = new ESUB(ee_sid);
            es_tmp.set_notification_url(this.ID.notification_url);
            return this.cse_sys.create_resource(es_tmp);
        } catch (err) { 
            console.log('\n\n----- ERROR in SAEsys.activate_service -----\n', err); return Promise.reject([9000, err]); 
        }
    }

    // event type: notification, request, and response
    async publish_Event(ee_sid, msg) {
        try {
            var evt_msg = new EventMessage(ee_sid, shortid.generate(), 'esi:nti', this.ID.callback_sid, msg);
            var evt_rsr = new Event(evt_msg);
            return this.cse_sys.create_resource(evt_rsr);
        } catch (err) { console.log('\n\n----- ERROR in SAEsys.publish_Event -----\n', err); return Promise.reject([9000, err]); }
    }
    async publish_Request(ee_sid, msg, handler) {
        try {
            var ee_rsr = await this.cse_sys.retrieve_resource(ee_sid);
            if (!ee_rsr.is_responsive())
                return Promise.reject([9000, 'Request to non-responsive EE by' + this.ID.ae, CustomUti.file_line(new Error(''))]);

            var evt_id = shortid.generate();
            this.register_response_handler(evt_id, handler)
            var evt_msg = new EventMessage(ee_sid, evt_id, 'esi:rqp', this.ID.callback_sid, msg);
            var evt_rsr = new Event(evt_msg);
            return this.cse_sys.create_resource(evt_rsr);
        } catch (err) { console.log('\n\n----- ERROR in SAEsys.publish_Request -----\n', err); return Promise.reject([9000, err]); }

    }
    async publish_Response(evt_msg, msg) {
        try {
            var resp_msg = new EventMessage(evt_msg.from_ee, evt_msg.event_id, 'esi:rsp', this.ID.callback_sid, msg);
            var evt_rsr = new Event(resp_msg);
            return this.cse_sys.create_resource(evt_rsr);
        } catch (err) { console.log('\n\n----- ERROR in SAEsys.publish_Response -----\n', err); return Promise.reject([9000, err]); }
    }

    //
    register_Service (servName, ee_sid) {
        var func = this.function_dir.key_to_value(servName);
        if (!func) return new Error([9000, 'function not found in function_dir']);
        else {
            this.service_dir.add_item(servName, ee_sid);
            this.cse_sys.register_notification(ee_sid, func, 'esi');
        }
    }
    deregister_Service(servName) {
        var ee_sid = this.service_dir.key_to_value(servName);
        this.service_dir.delete_item(servName);
        this.cse_sys.deregister_notification(ee_sid);
    }
    register_multiple_Services (pairs) {
        pairs.forEach((pair) => { this.register_Service(pair[0], pair[1]); });
    }

    // 
    register_Function(servName, func) {
        console.log('\n-- SAE.register_Function --\n', servName);
        this.function_dir.add_item(servName, func);
    }
    register_mutliple_Functions(pairs) {
        if (!Array.isArray(pairs)) throw [9000, 'register_multiple_functions: not array', CustomUtil.file_line(new Error(''))];
        pairs.forEach((pair) => { this.register_Function(pair[0], pair[1]) });
    }

    //
    register_SAE() { }
    deregister() { }
    login(appId) { }
    logout() { }

    // // Interface for oneM2M resource access functions
    // CU_resource(op, type, rsr_inst, params) {
    //     switch (type) {
    //         case 'esi:sae':
    //         case 'esi:ee':
    //         case 'esi:sub': {
    //             if (rsr_inst.esitype != type) return Promise.reject([9000, 'resource type is not ' + type]);
    //             break;
    //         }
    //         default: {
    //             if (rsr_inst.type != type) return Promise.reject([9000, 'resource type is not ' + type]);
    //         }
    //     };
    //     switch (op) {
    //         case 1: return this.cse_sys.create_resource(rsr_inst, params); break;
    //         case 3: return this.cse_sys.update_resource(rsr_inst, params); break;
    //     }
    // }
    // RD_resource(op, type, sid, params) {
    //     var rsr_inst;
    //     switch (op) {
    //         case 2: rsrProm = this.cse_sys.retrieve_resource(sid, params); break;
    //         case 4: rsrProm = this.cse_sys.delete_resource(sid, params); break;
    //     }
    //     rsrProm.then((rsr_inst) => {
    //         switch (type) {
    //             case 'esi:sae':
    //             case 'esi:ee':
    //             case 'esi:esub': {
    //                 if (rsr_inst.esitype != type)
    //                     return Promise.reject([9000, 'resource type is not ' + type, 'ServiceEnabledAppEntity:retrieve_SAE']);
    //                 else return Promise.resolve(rsr_inst);
    //             }
    //             default: {
    //                 if (rsr_inst.type != type) return Promise.reject([9000, 'resource type is not ' + type]);
    //             }
    //                 return Promise.resolve(rsr_inst);
    //         }
    //     });
    // }

    // create_CNT(cnt_inst, params) { return this.CU_resource(1, 'm2m:cnt', cnt_inst, params); }
    // retrieve_CNT(sid, params) { return this.RD_resource(2, 'm2m:cnt', sid, params); }
    // update_CNT(cnt_inst, params) { return this.CU_resource(3, 'm2m:cnt', cnt_inst, params); }
    // delete_CNT(sid) { return this.RD_resource(4, 'm2m:cnt', sid, params); }

    // create_CIN(cin_inst, params) { return this.CU_resource(1, 'm2m:cin', cin_inst, params); }
    // retrieve_CIN(sid, params) { return this.this.RD_resource(2, sid, params); }
    // delete_CIN(sid, params) { return this.RD_resource(4, 'm2m:cin', sid, params); }

    // create_SUB(sub_inst, params) { return this.CU_resource(1, 'm2m:sub', sub_inst, params); }
    // retrieve_SUB(sid, params) { return this.RD_resource(2, 'm2m:sub', sid, params); }
    // update_SUB(sub_inst, params) { return this.CU_resource(3, 'm2m:sub', sub_inst, params); }
    // delete_SUB(sid) { return this.RD_resource(4, 'm2m:sub', sid, params); }
}

module.exports = SAEsys;
