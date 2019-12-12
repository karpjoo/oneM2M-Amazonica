
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

const should = require('should');

const NSEsys = require('../Systems/NSEsys');
const mqttNSE = NSEsys.mqttNSE;
const CustomUtil = require('../Commons/CustomUtil');
const Primitive = require('../DataTypes/Primitive');
const SAE = require('../Resources/SAE');
const EE = require('../Resources/EE');
const ESUB = require('../Resources/ESUB');
const Event = require('../Resources/Event');
const EventMessage = require('../DataTypes/EventMessage');
const AE = require('../Resources/AE');
const CNT = require('../Resources/CNT');
const CIN = require('../Resources/CIN');
const SUB = require('../Resources/SUB');

// Every method returns a Promise object
class CSEsys {
    constructor(cse_config) {
        cse_config.should.have.keys('cse_id', 'csebase', 'ae_id', 'nse_config');
        // configuration for CSE
        // { 'cse_id' : '', 'csebase' : '', 'ae_id' : '', 'nse_config' : {} }
        this.cse_id = cse_config.cse_id;
        this.csebase = cse_config.csebase;
        this.ae_id = cse_config.ae_id;

        // configuration for NSE
        // where should bodytype be ? here in CSE or in NSE
        this.nse_config = CustomUtil.deep_clone(cse_config.nse_config); // nse_config : { type : 'mqtt', bodytype : 'json', broker : [ ip, port] }
        this.nse_sys = null;
        if (this.nse_config.protocol == 'mqtt') {
            this.nse_config.cse_id = this.cse_id;
            this.nse_config.ae_id = this.ae_id;
            this.nse_sys = new mqttNSE(this.nse_config);
        } else if (this.nse_config.type == 'http') { }
    }

    start() {
        try {
            return this.nse_sys.start()
        } catch (err) {
            console.log('\nERROR(CommonServiceEntity.Start): ', err);
            process.exit(9000);
        }
    }

    // 
    register_notification(ee_id, handler, type) {
        // should.exist(sub_id);
        // should.exist(handler);        
        // sub_id.should.be.a.String();
        // handler.should.be.a.Function();
        try {
            if(type == undefined) type = 'esi';
            this.nse_sys.register_notification(ee_id, handler, type);
        } catch (err) {
            console.log('\nERROR(CSEsys.register_notification): ', err);
            process.exit(9000);
        }
    }
    deregister_notification(esub_id) {
        try {
            this.nse_sys.deregister_notification(ee_id);
        } catch (err) {
            console.log('\nERROR(CSEsys.deregister_notification): ', err);
            process.exit(9000);
        }
    }        

    //
    request(reqPrim) {
        try {
            // console.log('\n\n----- CSEsys.request -----\n', JSON.stringify(reqPrim, null, 2));
            return this.nse_sys.request(reqPrim);
        } catch (err) {
            console.log('\nERROR(CSEsys.request): ', err);
            process.exit(9000); 
        }
    }
    response(respPromise, rsc) {
        try {
            return respPromise.then((respPrim) => {
                // console.log('\n\n----- CSEsys.response -----\n', JSON.stringify(respPrim, null, 2));
                if (respPrim.content['rsc'] != rsc) return Promise.reject([respPrim.content['rsc'], respPrim.content['pc']['m2m:dbg'], CustomUtil.file_line(new Error(''))]);
                else return Promise.resolve(respPrim.content);
            });
        } catch (err) {
            console.log('\nERROR(CSEsys.request): ', err);
            process.exit(9000);
        }
    }

    //
    create_params(op, params, rsr_inst) {
        // should.exist(params);
        // params.should.have('to');

        var req_params = {};

        // operation
        req_params.op = op;

        // to and from
        switch (op) {
            case 1: req_params.to = rsr_inst.psid(); break;
            case 3: req_params.to = rsr_inst.sid(); break;
            case 2:
            case 4: req_params.to = params.to; break;
            default: throw [9000, 'CSEsys.create_params']; break;
        }
        req_params.fr = this.ae_id;

        // resource type
        if (op == 1) {
            switch (rsr_inst.type()) {
                case 'm2m:ae': req_params.ty = 2; break;
                case 'm2m:cnt': req_params.ty = 3; break;
                case 'm2m:cin': req_params.ty = 4; break;
                case 'm2m:sub': req_params.ty = 23; break;
                default: throw [9000, 'CSEsys.create_params']; break;
            }
        }

        // for retrieve, fc is required by wdc although it is optional
        if (op == 2) {
            if (params == undefined) req_params.fc = {};
            else if (!params.hasOwnProperty('fc')) req_params.fc = {};
            else { req_params.fc = params.fc; }
        }

        // additional params
        if (params != undefined) {
            for (let paid in params) {
                if (params.hasOwnProperty('to') ||
                    params.hasOwnProperty('ty') ||
                    params.hasOwnProperty('fr') ||
                    params.hasOwnProperty('fc')) continue;
                req_params[paid] = params[paid];
            }
        }

        return req_params;
    }

    recover_resource(psid, name, prom) {
        return prom.then(
            (res) => {
                var rsr_sid = psid + '/' + name;
                if (!res.hasOwnProperty('pc')) return Promise.reject([9000, 'no pc', CustomUtil.file_line(new Error(''))]);

                var m2m_type = Object.keys(res.pc)[0];
                var res_attrs = res.pc[m2m_type];
                switch (res_attrs.ty) {
                    case 2: { // 'm2m:ae'
                        if (res_attrs.hasOwnProperty('lbl')) {
                            if (res_attrs.lbl.includes('esi')) {
                                var sae_rsr = new SAE(rsr_sid, res_attrs);
                                sae_rsr.update_esi_attrs();
                                return Promise.resolve(sae_rsr);
                            }
                        }
                        return Promise.resolve(new AE(rsr_sid, res_attrs));
                    }
                    case 3: { // 'm2m:cnt'
                        if (res_attrs.hasOwnProperty('lbl')) {
                            if (res_attrs.lbl.includes('esi')) {
                                var ee_rsr = new EE(rsr_sid, res_attrs);
                                ee_rsr.update_esi_attrs();
                                return Promise.resolve(ee_rsr);
                            }
                        }
                        return Promise.resolve(new CNT(rsr_sid, res_attrs));
                    }
                    case 4: { // 'm2m:cin'
                        if (res_attrs.hasOwnProperty('lbl')) {
                            if (res_attrs.lbl.includes('esi')) {
                                var ev_rsr = new Event(res_attrs.con, res_attrs);
                                ev_rsr.update_esi_attrs();
                                return Promise.resolve(ev_rsr);
                            }
                        }
                        return Promise.resolve(new CIN(psid, name, res_attrs));
                    }
                    case 23: { // 'm2m:sub' 
                        if (res_attrs.hasOwnProperty('lbl')) {
                            if (res_attrs.lbl.includes('esi')) {
                                var es_rsr = new ESUB(CustomUtil.psid(rsr_sid), CustomUtil.name(rsr_sid), res_attrs);
                                es_rsr.update_esi_attrs();
                                return Promise.resolve(es_rsr);
                            }
                        }
                        return Promise.resolve(new SUB(psid, name, res_attrs));
                    }
                    default:
                        return Promise.reject([9000, 'unkrown resource', CustomUtil.file_line(new Error(''))]);
                }
            },
            (rej) => { return Promise.reject(rej); }
        );
    }

    // interface CRUD functions
    create_resource(rsr_inst, params) {
        try {
            // console.log('\n\n----- CSEsys.create_resource -----\n', JSON.stringify(rsr_inst, null, 2), '\n', JSON.stringify(params, null, 2));
            rsr_inst.update_lbl();
            var resProm = this.CU_resource(1, rsr_inst, params);
            return this.recover_resource(rsr_inst.psid(), rsr_inst.name(), resProm);
        } catch (err) {
            console.log('\nERROR: ', err);
            process.exit(9000);
        }
    }
    update_resource(rsr_inst, params) {
        try {
            // console.log('\n\n----- CSEsys.update_resource -----\n', JSON.stringify(rsr_inst, null, 2), '\n', JSON.stringify(params, null, 2));
            rsr_inst.update_lbl();
            var resProm = this.CU_resource(3, rsr_inst, params);
            return this.recover_resource(rsr_inst.psid(), rsr_inst.name(), resProm);
        } catch (err) {
            console.log('\nERROR: ', err);
            process.exit(9000);
        }

    }
    retrieve_resource(sid, params) {
        try {
            // console.log('\n\n----- CSEsys.retrieve_resource -----\n', sid, params);
            var resProm = this.RD_resource(2, sid, params);
            return this.recover_resource(CustomUtil.psid(sid), CustomUtil.name(sid), resProm);
        } catch (err) {
            console.log('\nERROR: ', err);
            process.exit(9000);
        }
    }
    delete_resource(sid, params) {
        try {
            // console.log('\n\n----- CSEsys.delete_resource -----\n', sid, params);
            var resProm = this.RD_resource(4, sid, params);
            return this.recover_resource(CustomUtil.psid(sid), CustomUtil.name(sid), resProm);
        } catch (err) {
            console.log('\nERROR: ', err);
            process.exit(9000);
        }
    }

    // actual CRUD operation
    CU_resource(op, rsr_inst, params) {
        try {
            var req_params = this.create_params(op, params, rsr_inst);
            var reqPrim = {};
            var typed_rsr = {};
            switch (op) {
                case 1:
                case 3:
                    typed_rsr[rsr_inst.type()] = rsr_inst.generate_prim_attrs(op);
                    reqPrim = Primitive.create_reqPrim(req_params, typed_rsr);
                    break;
                default:
                    return Promise.reject([9000, 'CSEsys.create_resource', CustmUtil.file_line(new Error(''))]);
            }
        } catch (err) {
            return Promise.reject(err);
        }

        var rsc;
        switch (op) {
            case 1: rsc = 2001; break;
            case 3: rsc = 2004; break;
            default:
                return Promise.reject([9000, 'CSEsys.create_resource', CustmUtil.file_line(new Error(''))]);
        }

        var respPromise = this.request(reqPrim);
        return this.response(respPromise, rsc);
    }

    RD_resource(op, sid, params) {
        try {
            var rd_params = (params == undefined) ? {} : CustomUtil.deep_clone(params);
            rd_params.to = sid;
            var req_params = this.create_params(op, rd_params);

            var reqPrim = {};
            switch (op) {
                case 2:
                case 4:
                    reqPrim = Primitive.create_reqPrim(req_params);
                    break;
                default:
                    return Promise.reject([9000, 'CSEsys.RD_resource', CustomUtil.file_line(new Error(''))]);
            }
        } catch (err) {
            return Promise.reject(err);
        }

        var rsc;
        switch (op) {
            case 2: rsc = 2000; break;
            case 4: rsc = 2002; break;
            default:
                return Promise.reject([9000, 'CSEsys.RD_resource', CustomUtil.file_line(new Error(''))]);
        }
        var respPromise = this.request(reqPrim);
        return this.response(respPromise, rsc);
    }
}

module.exports = CSEsys;
