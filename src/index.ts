import "./loadEnv";

import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import { clerkClient, clerkPlugin, getAuth } from "@clerk/fastify";
import getContractMethodSignatures from "./services/EthersService";
import { runRecoverERC } from "./services/FlashBotERC20Service";
import { HttpStatusCode } from "axios";

const fastify = Fastify({ logger: true });
const typeString = { type: 'string' }; // since i will be using this type a lot
const typeNumber = { type: 'number' }; // since i will be using this type a lot

/**
 * Register the Clerk plugin globally.
 * By default, Clerk will initialise using the API keys from the environment if found.
 *
 * If you prefer to pass the keys to the plugin explicitly, see `src/using-runtime-keys.ts`
 * If you prefer to register the plugin for specific routes only, see `src/authenticating-specific-routes.ts`
 */
fastify.register(clerkPlugin);

fastify.get("/", async (req, reply) => {
  reply.send('Hello There you are here ');

});


fastify.get('/contractDetails', async (request:any, reply)  => { 
  console.log(request.query?.address); 
  const methods = await getContractMethodSignatures(request.query.address); 
  if(methods!==null)
  reply.send(methods); 
  else
  reply.send(0);
 
})
const recoverySchema = {
  body: {
    type: 'object',
    required: ['erc20Address', 'compromisedPrivateKey','erc20Recipient','ethBribeAmount'],
    properties: {
      erc20Address: typeString, // recall we created typeString earlier
      compromisedPrivateKey: typeString,
      erc20Recipient: typeString,
      ethBribeAmount: typeNumber,
    },
  },
  response: {
    200: typeString, // sending a simple message as string
  },
};

const recoveryHandler = async (req:any, reply:any) => {
  const { erc20Address, compromisedPrivateKey ,erc20Recipient,ethBribeAmount} = req.body;  
   try{
    const result = await runRecoverERC(erc20Address, compromisedPrivateKey ,erc20Recipient,ethBribeAmount); 

    reply.send(result);
   } catch(error){
    reply.send(HttpStatusCode.ExpectationFailed);
   }
  
};



const recoveryOpts = {
  schema: recoverySchema, // will be created in schemas/posts.js
  handler: recoveryHandler, // will be created in handlers/posts.js
};

fastify.post('/processRecovery', recoveryOpts) ; 

/*
 const erc20Address = values['erc20Address'];
            const compromisedPrivateKey = values['compromisedPrivateKey'];
            const erc20Recipient = values['erc20Recipient'];
            const ethBribeAmount = values['ethBribeAmount'].toString();
*/


const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT });
  } catch (err) {
    fastify.log.error(err); 
  }
};

start();
