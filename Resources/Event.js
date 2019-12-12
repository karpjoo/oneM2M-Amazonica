
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

const CustomUtil = require('../Commons/CustomUtil');
const Resource = require('../Resources/Resource');

class Event extends Resource {
    constructor(evt_msg, m2m_attrs) {
        super('m2m:cin', evt_msg.ee_sid, evt_msg.evt_id, m2m_attrs);
        this.admin.esitype = 'esi:evt';
        this.esi_attrs = {}; // no use for now
        this.m2m_attrs.con = CustomUtil.deep_clone(evt_msg);
        // this.attrs.con = new EventMessage(ee_sid, this.name, this.ev_attrs.subtype, rsp_sid, msg);
    }
    event_id() { return this.m2m_attrs.con.eid; }
    event_type() { return this.m2m_attrs.con.type; }
    // set_subtype(ty) { this.ev_attrs.subtype = ty; }
    from() { return this.m2m_attrs.con.from_sid; }
    // set_from(fr) { this.ev_attrs.from = fr; }
    // set from(from) { this.attrs.con.from = from; }
    message() { return this.m2m_attrs.con.message; }
    // set_message(evt_msg) { this.attrs.con.message = evt_msg; }
    static isEvent(attrs) {
        if ((attrs.hasOwnProperty('ty') == 4) && (attrs.hasOwnProperty('lbl'))) return (attrs.lbl.includes('esi'));
        else return false;
    }

    update_lbl() {
        this.m2m_attrs.lbl[0] = 'esi';
        this.m2m_attrs.lbl[1] = JSON.stringify(['esi:evt']);
    }
    update_esi_attrs() {
        this.esi_attrs = {};
    }
    // filter for attrs only in request primitive
    generate_prim_attrs(op) {
        if (op != 1) throw new Error('Event is not updatable');
        var prim_attrs = {};
        for (let ra in this.m2m_attrs) {
            switch (ra) {
                // universal
                case 'rn': if (op == 1) prim_attrs['rn'] = this.m2m_attrs['rn']; else { /* error */ } break;
                case 'cr': if (op == 1) prim_attrs['cr'] = this.m2m_attrs['cr']; else { /* error */ } break;
                case 'lbl': prim_attrs['lbl'] = this.m2m_attrs['lbl']; break;
                case 'ri':
                case 'pi':
                case 'ct':
                case 'lt':
                case 'ty': break;
                case 'et': prim_attrs['et'] = this.m2m_attrs['et']; break;
                // CIN-specific
                case 'con': prim_attrs['con'] = this.m2m_attrs['con']; break;
                case 'or': prim_attrs['or'] = this.m2m_attrs['or']; break;
                case 'cnf': prim_attrs['cnf'] = this.m2m_attrs['cnf']; break;
                case 'cs': break;
                case 'conr': prim_attrs['conr'] = this.m2m_attrs['conr']; break;
            }
        }
        return prim_attrs;
    }
}

module.exports = Event;

