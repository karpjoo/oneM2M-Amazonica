
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
const shortid = require('shortid');
const Resource = require('../Resources/Resource');

class ESUB extends Resource {
    constructor(ee_sid, name, m2m_attrs) {
        super('m2m:sub', ee_sid, (name == undefined) ? shortid.generate() : name, m2m_attrs);
        this.admin.esitype = 'esi:sub';
        this.esi_attrs = {};
        this.m2m_attrs.enc = { 'net' : [ 3 ] }; // for now, only interested in creation of direct child (i.e., m2m:cin)
    }
    listener() {
        if (this.m2m_attrs.hasOwnProperty('nu')) return this.m2m_attrs.nu.split('/')[3];
        else return undefined;
    }
    notification_url() { return this.m2m_attrs.nu; }
    set_notification_url(nu) { this.m2m_attrs.nu = nu; }
    set_event_types(tys) { 
        if(!this.m2m_attrs.hasOwnProperty('enc'))  this.m2m_attrs.enc = {};
        this.m2m_attrs.enc.net = tys;
    }
    update_lbl() {
        this.m2m_attrs.lbl = [];
        this.m2m_attrs.lbl[0] = 'esi';
        this.m2m_attrs.lbl[1] = JSON.stringify(['esi:sub']);
    }
    update_esi_attrs() { this.esi_attrs = {}; }
    
    // filter for attrs only in request primitive
    generate_prim_attrs(op) {
        var prim_attrs = {};
        for (let ra in this.m2m_attrs) {
            switch (ra) {
                // universal
                case 'rn': if (op == 1) prim_attrs['rn'] = this.m2m_attrs['rn']; break;
                case 'cr': if (op == 1) prim_attrs['cr'] = this.m2m_attrs['cr']; break;
                case 'lbl': prim_attrs['lbl'] = this.m2m_attrs['lbl']; break;
                case 'ri':
                case 'pi':
                case 'ct':
                case 'lt':
                case 'ty': break;
                case 'et': prim_attrs['et'] = this.m2m_attrs['et']; break;
                // AE-specific
                case 'enc': prim_attrs['enc'] = this.m2m_attrs['enc']; break;
                case 'nu': prim_attrs['nu'] = this.m2m_attrs['nu']; break;
                case 'nct': prim_attrs['nct'] = this.m2m_attrs['nct']; break; // notificationContentType
                case 'cs': break;
                case 'nec': prim_attrs['nec'] = this.m2m_attrs['nec']; break; // notificationEventCat
                case 'su': prim_attrs['su'] = this.m2m_attrs['su']; break; // subscriberURI
            }
        }
        return prim_attrs;
    }

}

module.exports = ESUB;

