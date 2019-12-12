

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

class EE extends Resource {
    constructor(sid, attrs) {
        super('m2m:cnt', CustomUtil.psid(sid), CustomUtil.name(sid), attrs);
        this.admin.esitype = 'esi:ee';
        this.esi_attrs = {};
        this.esi_attrs.subs = [];
        this.esi_attrs.control = {};
        this.esi_attrs.control.is_static = false;
        this.esi_attrs.control.is_responsive = false;
        this.esi_attrs.control.is_active = 'true';
    }
    // 
    is_active() { return this.esi_attrs.control.is_active; }
    is_callback() { return (this.esi_attrs.control.is_static && this.name() == 'esi_callback') }
    is_static() { return this.esi_attrs.control.is_static; }
    is_dedicated() { return (this.esi_attrs.control.is_static && this.esi_attrs.subs.length == 1); }
    is_responsive() { return this.esi_attrs.control.is_responsive; }

    set_active() { this.esi_attrs.control.is_active = true; }
    set_inactive() { this.esi_attrs.control.is_active = false; }

    // subscribers for Static, Dedicated, & Responsive Event Entity
    set_static(slist) { 
        this.set_subs(slist);
        this.esi_attrs.control.is_static = true; 
    }
    set_dedicated(aeid) { this.set_static([aeid]); }        
    set_responsive(aeid) { 
        this.set_subs([aeid]);
        this.esi_attrs.control.is_responsive = true; 
    }
    // subscribers
    subs() { return this.esi_attrs.subs; }
    set_subs(slist) { this.esi_attrs.subs = slist; }
    find_sub(aei) {
        var idx = this.esi_attrs.subs.indexOf(aei);
        if (idx == -1) return false; else return true;
    }

    // convert sae attrs to lbl and vice versa
    update_lbl() {
        if (this.m2m_attrs.lbl == undefined) this.m2m_attrs.lbl = [];
        this.m2m_attrs.lbl[0] = 'esi';
        this.m2m_attrs.lbl[1] = JSON.stringify(['esi:ee', this.subs(), this.esi_attrs.control]);
    }
    update_esi_attrs() {
        var attrs = JSON.parse(this.m2m_attrs.lbl[1]);
        this.set_subs(attrs[1]);
        this.esi_attrs.control = CustomUtil.deep_clone(attrs[2]);
    }

    // filter for attrs only in request primitive
    generate_prim_attrs(op) {
        var prim_attrs = {};
        for (let ra in this.m2m_attrs) {
            switch (ra) {
                // universal
                case 'rn': if (op == 1) prim_attrs['rn'] = this.m2m_attrs['rn']; else { /* error */ } break;
                case 'cr': if (op == 1) prim_attrs['cr'] = this.m2m_attrs['cr']; else { /* error */ } break;
                case 'lbl': prim_attrs['lbl'] = this.m2m_attrs['lbl']; break;
                case 'et': prim_attrs['et'] = this.m2m_attrs['et']; break;
                case 'ri':
                case 'pi':
                case 'ct':
                case 'lt':
                case 'ty': break;
                // AE-specific
                case 'li':
                case 'cbs':
                case 'cni': break;
                case 'mni': prim_attrs['mni'] = this.m2m_attrs['mni']; break;
                case 'mbs': prim_attrs['mbs'] = this.m2m_attrs['mbs']; break;
                case 'mia': prim_attrs['mia'] = this.m2m_attrs['mia']; break;
            }
        }
        return prim_attrs;
    }
}

module.exports = EE;

