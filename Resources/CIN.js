
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

// const CustomUtil = require('./CustomUtil');
const Resource = require('../Resources/Resource');

class CIN extends Resource {
    constructor(psid, name, attrs) {
        super('m2m:cin', psid, name, attrs);
    }
    // filter for attrs only in request primitive
    generate_prim_attrs(op) {
        if(op != 1) throw new Error('CIN is not updatable');
        var prim_attrs = {};
        for (let ra in this.attrs) {
            switch (ra) {
                // universal
                case 'rn': if(op == 1) prim_attrs['rn'] = this.attrs['rn']; else { /* error */ } break;
                case 'cr': if(op == 1) prim_attrs['cr'] = this.attrs['cr']; else { /* error */ } break;
                case 'lbl': prim_attrs['lbl'] = this.attrs['lbl']; break;
                case 'ri':
                case 'pi':
                case 'ct':
                case 'lt':
                case 'ty': break;
                case 'et': prim_attrs['et'] = this.attrs['et']; break;
                // CIN-specific
                case 'con': prim_attrs['con'] = this.attrs['con']; break;
                case 'or': prim_attrs['or'] = this.attrs['or']; break;
                case 'cnf': prim_attrs['cnf'] = this.attrs['cnf']; break;
                case 'cs': break;
                case 'conr': prim_attrs['conr'] = this.attrs['conr']; break;
            }
        }
        return prim_attrs;
    }
}

module.exports = CIN;

