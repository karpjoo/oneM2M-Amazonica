
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


class SAE extends Resource {
    constructor(sid, m2m_attrs) {
        // sae_attrs = { state : 'running or not-running', eSevices : { eervName : sub_id }}
        super('m2m:ae', CustomUtil.psid(sid), CustomUtil.name(sid), m2m_attrs);
        this.admin.esitype = 'esi:sae';
        this.esi_attrs = {};
        this.esi_attrs.state = 'running';
        this.esi_attrs.services = [];
    }

    // getters & setters
    poa() { if (this.m2m_attrs.hasOwnProperty(poa)) return this.m2m_attrs.poa; else return undefined; }
    set_poa(poa) { this.m2m_attrs.poa = poa; }
    app_name() { if (this.m2m_attrs.hasOwnProperty('apn')) return this.m2m_attrs.apn; else return undefined; }
    set_app_name(apn) { this.m2m_attrs.apn = apn; }
    ae_id() { if (this.m2m_attrs.hasOwnProperty('aei')) return this.m2m_attrs.aei; else return undefined; }
    set_ae_id(aei) { this.m2m_attrs.aei = aei; }
    app_id() { if (this.m2m_attrs.hasOwnProperty('api')) return this.m2m_attrs.api; else return undefined; }
    set_app_id(api) { this.m2m_attrs.api = api; }
    rr() { if (this.m2m_attrs.hasOwnProperty('rr')) return this.m2m_attrs.rr; else return undefined; }
    set_rr(r) { /* boolean */ this.m2m_attrs.rr = r; }

    // state of SAE
    state() { return this.esi_attrs.state; }
    set_state(state) { 
        this.esi_attrs.state = state; 
    }

    // List of services
    set_services(servList) { this.esi_attrs.services = CustomUtil.deep_clone(servList); }
    services () { return this.esi_attrs.services; }

    // convert sae attrs to lbl and vice versa
    update_lbl() {
        if(this.m2m_attrs.lbl == undefined) this.m2m_attrs.lbl = [];
        this.m2m_attrs.lbl[0] = 'esi';
        // this.m2m_attrs.lbl[1] = JSON.stringify(['esi:sae', this.state(), this.esi_attrs.service_dir.generate_pairs()]);
        this.m2m_attrs.lbl[1] = JSON.stringify(['esi:sae', this.state(), this.services()]);
        // this.attrs.lbl[1] = ['esi:sae', this.state(), JSON.stringify(this.esi_attrs.service_dir.generate_pairs())];
    }
    update_esi_attrs() {
        var attr_list = JSON.parse(this.m2m_attrs.lbl[1]);
        this.set_state(attr_list[1]);  
        this.set_services(attr_list[2]); 
    }
    // filter for attrs only in request primitive
    generate_prim_attrs(op) {
        var prim_attrs = {};
        for(let ra in this.m2m_attrs) {
            switch(ra) {
                // universal
                case 'rn': if(op == 1) prim_attrs['rn'] = this.m2m_attrs['rn']; break; 
                case 'lbl': prim_attrs['lbl'] = this.m2m_attrs['lbl']; break;
                case 'acpi': prim_attrs['acpi'] = this.m2m_attrs['acpi']; break;
                case 'ri':
                case 'pi':
                case 'ct':
                case 'lt':  
                case 'ty': break;
                // AE-specific
                case 'aei': break;
                case 'et': prim_attrs['et'] = this.m2m_attrs['et']; break;
                case 'or': prim_attrs['or'] = this.m2m_attrs['or']; break;
                case 'nl': prim_attrs['nl'] = this.m2m_attrs['nl']; break;
                case 'apn': prim_attrs['apn'] = this.m2m_attrs['apn']; break;
                case 'api': if(op == 1) prim_attrs['api'] = this.m2m_attrs['api']; else { /* error */ } break;
                case 'poa': prim_attrs['poa'] = this.m2m_attrs['poa']; break;
                case 'rr': prim_attrs['rr'] = this.m2m_attrs['rr']; break;
            }                   
        }
        return prim_attrs;
    }
}

module.exports = SAE;

// var ae_rsr = {
//     // universal
//     rn: 'resourceName',
//     ty: 'resourceType',
//     ri: 'resourceID',
//     pi: 'parentID',
//     acpi: 'accessControlPolicyIDs',
//     ct: 'creationTime',
//     et: 'expirationTime',
//     lt: 'lastModificationTime',
//     lbl: 'labels',
//     at: 'announceTo',
//     aa: 'announcedAttribute',
//     daci: 'dynamicAuthorizationConsultationIDs',
//     // ae-specific
//     apn: 'appName',
//     api: 'App-ID',
//     aei: 'AE-ID',
//     poa: 'pointOfAccess',
//     or: 'ontologyRef',
//     nl: 'nodeLink',
//     rr: 'requestReachability',
//     csz: 'contentSerialization',
//     esi: 'e2eSecInfo',
//     mei: 'M2M-Ext-ID',
//     srv: 'supportedReleaseVersions',
//     regs: 'registrationStatus',
//     trps: 'trackRegistrationPoints',
//     scp: 'sessionCapabilities',
//     tren: 'triggerEnable',
//     ape: 'activityPatternElements'
// };
