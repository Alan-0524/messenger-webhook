'use strict';

// Imports dependencies and set up http server
const
  express = require('express'),
  bodyParser = require('body-parser'),
  app = express().use(bodyParser.json()); // creates express http server
  var PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
  var request = require('request');
  // Sets server port and logs message on success
  var port = (process.env.PORT || 1337);
app.listen(port, () => console.log('webhook is listening'));

// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {  
  console.log('PAGE_ACCESS_TOKEN: ' + PAGE_ACCESS_TOKEN);
  let body = req.body;

  // Checks this is an event from a page subscription
  if (body.object === 'page') {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {

    // Gets the body of the webhook event
    let webhook_event = entry.messaging[0];
    console.log(webhook_event);

    // Get the sender PSID
    let sender_psid = webhook_event.sender.id;
    console.log('Sender PSID: ' + sender_psid);

    // Check if the event is a message or postback and
    // pass the event to the appropriate handler function
    if (webhook_event.message) {
      handleMessage(sender_psid, webhook_event.message);        
    } else if (webhook_event.postback) {
      handlePostback(sender_psid, webhook_event.postback);
    }
  
});

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

  // Your verify token. Should be a random string.
  //let VERIFY_TOKEN = "000000"
    
  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
    
  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
  
    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === PAGE_ACCESS_TOKEN) {
      
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);      
    }
  }
});

// Handles messages events
function handleMessage(sender_psid, received_message) {
  let response;

  // Check if the message contains text
  if (received_message.text) {    
    // Create the payload for a basic text message
	
	request({
    "uri": 'https://mymood-service.herokuapp.com/get_webhook/'+sender_psid+'/',
    "method": "GET"
	}, (err,res,body) => {
    if (!err) {
		var result = JSON.parse(body);
		console.log(result);
		var result_status = result["status"];
		if(result_status==0){
			response = { "text": `Welcome to register.` }
		}else if(result_status==1){
			response = { "text": `You're already in teams.` }
		}else{
			response = { "text": `System maintenance, please try again later.` }
		}
	     console.log(response);
      // Sends the response message
         callSendAPI(sender_psid, response); 
         console.log("Send complete");
    } else {
      console.error("Unable to send message:" + err);
    }
  }); 
  }  
  
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
   let response;
   // Get the payload for the postback
   let payload = received_postback.payload;
   // Set the response based on the postback payload
   if (payload === '0') {
      response = { "text": "Thanks!" }
   } else if (payload === '1') {
      response = { "text": "Oops, try sending another image." }
   }
   // Send the message to acknowledge the postback
   callSendAPI(sender_psid, response);
}


// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
	// Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }
  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  }); 
}