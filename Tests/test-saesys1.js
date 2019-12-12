


const shortid = require('shortid');
const config = require('config');
console.log('\n\n----- config -----\n', JSON.stringify(config, null, 2));

const SAEsys = require('../Systems/SAEsys');

const sae_sys = new SAEsys(config);

// const ee_id1 = 'wdc_base/EE' + shortid.generate();
const ee_id1 = 'wdc_base/EE-' + config.sae.id;
// const svc_id1 = 'eServ' + shortid.generate();
// const svc_id2 = 'eServ' + shortid.generate();
const svc_id1 = 'eServ1-' + config.sae.id;
const svc_id2 = 'eServ2-' + config.sae.id;

function callback_func (event) {
    console.log('\n\n***** callback: ', event);
}

function eServ1(event) {
    console.log('\n\n***** eService#1: ', event);
    sae_sys.publish_Response(event, 'Hi, oneM2M');
}
function eServ2(event) {
    console.log('\n\n***** eService#2: ', event);
}

async function test() {
    try {
        var sae_rsr = await sae_sys.initialize();
        // console.log('\n\n----- after SAEsys.initialize -----\n', JSON.stringify(sae_rsr, null, 2));
        console.log('\n\n----- after SAEsys.initialize -----\n');
        // console.log('\n\n----- after SAEsys.initialize -----\n', JSON.stringify(sae_sys, null, 2));

        sae_sys.register_Function(svc_id1, eServ1);
        var ee_rsr1 = await sae_sys.create_responsiveEE('wdc_base/' + svc_id1, svc_id1);
        console.log('\n\n----- after create_responsiveEE -----\n', JSON.stringify(ee_rsr1, null, 2));

        sae_sys.publish_Request('wdc_base/' + svc_id1, "Hello, ELSIO", callback_func);

        sae_sys.register_Function(svc_id2, eServ2);
        var ee_rsr2 = await sae_sys.create_EE(ee_id1);
        console.log('\n\n----- after create_EE -----\n', JSON.stringify(ee_rsr2, null, 2));
        var ee_rsr3 = await sae_sys.enable_Service(ee_id1, svc_id2);
        console.log('\n\n----- after enable_Service -----\n', JSON.stringify(ee_rsr3, null, 2));

        // sae_sys.publish_Event(ee_id1, { mid: shortid.generate(), msg : 'Hi, eServ2'});
        sae_sys.publish_Event(ee_id1, 'Hi, eServ2');

    } catch (err) { console.log(err); }
}

test();

