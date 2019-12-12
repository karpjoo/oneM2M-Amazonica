

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

// class Resource

const CustomUtil = require('../Commons/CustomUtil');

class Resource {
    // { admin : { type : '', psid : '' }, attrs : { rn : '', .... }
    constructor(type, psid, name, m2m_attrs) {
        this.admin = {};
        this.admin.type = type;
        this.admin.psid = psid; // structured ID

        if (m2m_attrs == undefined) this.m2m_attrs = {};
        else this.m2m_attrs = CustomUtil.deep_clone(m2m_attrs);
        this.m2m_attrs.rn = name;
        if(!this.m2m_attrs.hasOwnProperty('lbl')) this.m2m_attrs.lbl = [];
    }
    //
    sid() { return (this.admin.psid + '/' + this.m2m_attrs.rn); }
    psid() { return this.admin.psid; }
    type() { return this.admin.type; }
    esitype() { return (this.admin.hasOwnProperty('esitype') ? this.admin.esitype : undefined); }
    set_esitype(amt) { this.admin.esitype = amt; }
    name() { if (this.m2m_attrs.hasOwnProperty('rn')) return this.m2m_attrs.rn; else return undefined; }
    // set name(rn) { this.attrs.rn = rn; }
    acpi() { if (this.m2m_attrs.hasOwnProperty('acpi')) return this.m2m_attrs.acpi; else return undefined; }
    // set acpi(ais) { this.attrs.acpi = ais; }
    ty() { if (this.m2m_attrs.hasOwnProperty('ty')) return this.m2m_attrs.ty; else return undefined; }
    // set ty(ty) { this.attrs.ty = ty; }
    ri() { if (this.m2m_attrs.hasOwnProperty('ri')) return this.m2m_attrs.ri; else return undefined; }
    // set ri(ri) { this.attrs.ri = ri; }
    pi() { if (this.m2m_attrs.hasOwnProperty('pi')) return this.m2m_attrs.pi; else return undefined; }
    // set pi(pi) { this.attrs.pi = pi; }
    label() { if (this.m2m_attrs.hasOwnProperty('lbl')) return this.m2m_attrs.lbl; else return undefined; }
    // set label(lbl) { this.attrs.lbl = lbl; }

    set_attrs(m2m_attrs) {
        for (let atr_id in m2m_attrs) {
            this.m2m_attrs[atr_id] = m2m_attrs[atr_id];
        }
    }

    generateTyped() {
        var typedResource = {};
        typedResource[this.admin.type] = CustomUtil.deep_clone(this.m2m_attrs);
        return typedResource;
    }
    serialize() { return JSON.stringify(this.m2m_attrs); }
    serializedTyped() { return JSON.stringify(generateTyped()); }
    inflate(serialized) {
        if (!(typeof serialized) == String) throw new Error('Resource.inflate: not a string');
        var rsr_inst = JSON.parse(serialized);
        this.admin.type = rsr_inst.type();
        this.admin.esitype = rsr_inst.esitype();
        this.admin.psid = rsr_inst.psid();
        this.m2m_attrs = CustomUtil.deep_clone(rsr_inst.m2m_attrs);

        if (!validate(this.m2m_attrs)) {
            this.m2m_attrs = undefined;
            throw new Error('Resource.inflate');
        }
    }
    validate(attrs) { return true; }
    static fix_attrs(attrs, checks) {
        var fixed_attrs = JSON.parse(JSON.stringify(attrs));
        for (let key in checks) {
            if (checks[key] == '$') {
                if (!fixed_attrs.hasOwnProperty(key)) throw new Error('fix_attrs');
            } else if (!fixed_attrs.hasOwnProperty(key)) fixed_attrs[key] = checks[key];
            else if (fixed_attrs[key] != checks[key]) throw new Error('fix_attrs');
        }
        return fixed_attrs;
    }
}

module.exports = Resource;

