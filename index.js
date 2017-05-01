var $ = require('jquery');
var jsdom = require('jsdom');
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var app = express();

// Wit.ai parameters
const WIT_TOKEN = 'HKTPCRXNFP5OYDKV3QZEERC4TSLZOLFK';

// Messenger API parameters
const FB_PAGE_TOKEN = 'EAAbI7HQaG5wBAGalHZAR8cssoctb2cZB2F06QNYDpLRxO9Mo3KGdfaBpLxtb3EiDcXKNCpuMReIQoNbrEFqNi8tRxJl7SICEiwhT1C39IqHsf2ToyM931zPooTDvn4wQTHp1RdXULPWZBAzOH4WJRBNKmh0dCJ68Xyowm1Gzk5MmNHnAW8A';

var accessToken = 'HKTPCRXNFP5OYDKV3QZEERC4TSLZOLFK';
//var Wit = require('node-wit').Wit;
//var interactive = require('node-wit').interactive;
let Wit = null;
let log = null;
let interactive = null;
try {
  // if running from repo
  Wit = require('../').Wit;
  log = require('../').log;
} catch (e) {
  Wit = require('node-wit').Wit;
  log = require('node-wit').log;
  interactive = require('node-wit').interactive;
}
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.listen((process.env.PORT || 3000));

// ----------------------------------------------------------------------------
// Messenger API specific code

// See the Send API reference
// https://developers.facebook.com/docs/messenger-platform/send-api-reference

const fbMessage = (id, text) => {
	if(text == "mainmenu"){

      var body = JSON.stringify({
          recipient:{
            id: id
          },
          message:{
            attachment:{
              type:"template",
              payload:{
                template_type:"generic",
                elements:[
                   {
                    title:'Plans',
                    image_url:'http://www.xynapse-asia.com/webe/plan.jpg',
                    subtitle:'Explore exacting services',
                    buttons:[
                      {
                        type:"postback",
                        title:"Check Now",
                        payload:"Plans"
                      }          
                    ]
                  },
                  {
                    title:'Build My Bundle',
                    image_url:'http://www.xynapse-asia.com/webe/bundle-x.jpg',
                    subtitle:'Get your perfect bundle',
                    buttons:[
                     {
                        type:"postback",
                        title:"Check Now",
                        payload:"Build My Bundle"
                      }              
                    ]      
                  },
                  {
                    title:'Account Usage',
                    image_url:'http://www.xynapse-asia.com/webe/AccountUsage1.jpg',
                    subtitle:'Check your account usage',
                    buttons:[
                     {
                        type:"postback",
                        title:"Check Balance",
                        payload:"Account Usage"
                      }              
                    ]      
                  },
                  {
                    title:'Payment History',
                    image_url:'http://www.xynapse-asia.com/webe/PaymentHistory.jpg',
                    subtitle:'Check your payment history/transaction',
                    buttons:[
                      {
                        type:"postback",
                        title:"Show History",
                        payload:"Payment History"
                      }              
                    ]
                  },
                  {
                    title:'Buy Smart Bytes',
                    image_url:'http://www.xynapse-asia.com/webe/BuySmartBytes1.jpg',
                    subtitle:'Buy a smart bytes',
                    buttons:[
                     {
                        type:"postback",
                        title:"Buy Now",
                        payload:"Buy Smart Bytes"
                      }              
                    ]      
                  },
                  {
                    title:'Help and Support',
                    image_url:'http://www.xynapse-asia.com/webe/HelpandSupport.jpg',
                    subtitle:'Help on your fingertips',
                    buttons:[
                     {
                        type:"postback",
                        title:"Help",
                        payload:"Help"
                      }              
                    ]      
                  }
                ]
              }
            }
          }});
      
    }
  const body = JSON.stringify({
    recipient: { id },
    message: { text },
  });
  const qs = 'access_token=' + encodeURIComponent(FB_PAGE_TOKEN);
  return fetch('https://graph.facebook.com/me/messages?' + qs, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body,
  })
  .then(rsp => rsp.json())
  .then(json => {
    if (json.error && json.error.message) {
      throw new Error(json.error.message);
    }
    return json;
  });
};

// ----------------------------------------------------------------------------
// Wit.ai bot specific code

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
const sessions = {};

const findOrCreateSession = (fbid) => {
  let sessionId;
  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(k => {
    if (sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k;
    }
  });
  if (!sessionId) {
    // No session found for user fbid, let's create a new one
    sessionId = new Date().toISOString();
    sessions[sessionId] = {fbid: fbid, context: {}};
  }
  return sessionId;
};

const firstEntityValue = (entities, entity) => {
  const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0].value
  ;
  if (!val) {
    return null;
  }
  return typeof val === 'object' ? val.value : val;
};

// Our bot actions
const actions = {
  send({sessionId}, {text}) {
    // Our bot has something to say!
    // Let's retrieve the Facebook user whose session belongs to
    const recipientId = sessions[sessionId].fbid;
    if (recipientId) {
      // Yay, we found our recipient!
      // Let's forward our bot response to her.
      // We return a promise to let our bot know when we're done sending
      return fbMessage(recipientId, text)
      .then(() => null)
      .catch((err) => {
        console.error(
          'Oops! An error occurred while forwarding the response to',
          recipientId,
          ':',
          err.stack || err
        );
      });
    } else {
      console.error('Oops! Couldn\'t find user for session:', sessionId);
      // Giving the wheel back to our bot
      return Promise.resolve()
    }
  }
  // You should implement your custom actions here
  // See https://wit.ai/docs/quickstart
};

// Setting up our bot
const wit = new Wit({
  accessToken: WIT_TOKEN,
  actions,
  logger: new log.Logger(log.INFO)
});

// Server frontpage
app.get('/', function (req, res) {
    res.send('This is TestBot Server');
});

// Facebook Webhook
app.get('/webhook', function (req, res) {
    if (req.query['hub.verify_token'] === 'testbot_verify_token') {
        res.send(req.query['hub.challenge']);
    } else {
        res.send('Invalid verify token');
    }
});

// handler receiving messages
/*app.post('/webhook', function (req, res) {
    var events = req.body.entry[0].messaging;
    for (var i = 0; i < events.length; i++) {
        var event = events[i];
        if (event.message && event.message.text) {
            if (!kittenMessage(event.sender.id, event.message.text)) {
				//sendMessage(event.sender.id, {text: "Echo: " + event.message.text});
				//const client = new Wit({accessToken, actions});
				//interactive(client);
				console.log("Send witMessage:" + event.message.text);
				witMessage(event.sender.id, event.message.text);
			}
        }else if (event.postback) {
			console.log("Postback received: " + JSON.stringify(event.postback));
		}
    }
    res.sendStatus(200);
});*/

// Message handler
app.post('/webhook', (req, res) => {
  // Parse the Messenger payload
  // See the Webhook reference
  // https://developers.facebook.com/docs/messenger-platform/webhook-reference
  const data = req.body;

  if (data.object === 'page') {
    data.entry.forEach(entry => {
      entry.messaging.forEach(event => {
        if (event.message && !event.message.is_echo) {
          // Yay! We got a new message!
          // We retrieve the Facebook user ID of the sender
          const sender = event.sender.id;

          // We retrieve the user's current session, or create one if it doesn't exist
          // This is needed for our bot to figure out the conversation history
          const sessionId = findOrCreateSession(sender);

          // We retrieve the message content
          const {text, attachments} = event.message;

          if (attachments) {
            // We received an attachment
            // Let's reply with an automatic message
            fbMessage(sender, 'Sorry I can only process text messages for now.')
            .catch(console.error);
          } else if (text) {
            // We received a text message
			console.log('Received a text:'+text);

            // Let's forward the message to the Wit.ai Bot Engine
            // This will run all actions until our bot has nothing left to do
            wit.runActions(
              sessionId, // the user's current session
              text, // the user's message
              sessions[sessionId].context // the user's current session state
            ).then((context) => {
              // Our bot did everything it has to do.
              // Now it's waiting for further messages to proceed.
              console.log('Waiting for next user messages');

              // Based on the session state, you might want to reset the session.
              // This depends heavily on the business logic of your bot.
              // Example:
              // if (context['done']) {
              //   delete sessions[sessionId];
              // }

              // Updating the user's current session state
              sessions[sessionId].context = context;
            })
            .catch((err) => {
              console.error('Oops! Got an error from Wit: ', err.stack || err);
            })
          }
        } else if (event.postback) {
          processPostback(event);
        }else {
          console.log('received event', JSON.stringify(event));
        }
      });
    });
  }
  res.sendStatus(200);
});

function processPostback(event) {
  var senderId = event.sender.id;
  var payload = event.postback.payload;

  if (payload === "Greeting") {
    // Get user's first name from the User Profile API
    // and include it in the greeting
    request({
      url: "https://graph.facebook.com/v2.8/" + senderId,
      qs: {
        access_token: FB_PAGE_TOKEN,
        fields: "first_name"
      },
      method: "GET"
    }, function(error, response, body) {
      var greeting = "";
      if (error) {
        console.log("Error getting user's name: " +  error);
      } else {
        var bodyObj = JSON.parse(body);
        name = bodyObj.first_name;
        greeting = "Hi " + name + ". ";
      }
      var message = greeting + "My name is Support Bot. I can tell you various details regarding your problem. What would you like to know about?";
      sendMessage(senderId, {text: message});
    });
  }
}

// generic function sending messages
function sendMessage(recipientId, message) {
	console.log("inside sendMessage message:" + message);
    request({
        url: 'https://graph.facebook.com/v2.8/me/messages',
        qs: {access_token: 'EAAbI7HQaG5wBAGalHZAR8cssoctb2cZB2F06QNYDpLRxO9Mo3KGdfaBpLxtb3EiDcXKNCpuMReIQoNbrEFqNi8tRxJl7SICEiwhT1C39IqHsf2ToyM931zPooTDvn4wQTHp1RdXULPWZBAzOH4WJRBNKmh0dCJ68Xyowm1Gzk5MmNHnAW8A'},
        method: 'POST',
        json: {
            recipient: {id: recipientId},
            message: message,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
};

// send rich message with kitten
function kittenMessage(recipientId, text) {
    
    text = text || "";
    var values = text.split(' ');
    
    if (values.length === 3 && values[0] === 'kitten') {
        if (Number(values[1]) > 0 && Number(values[2]) > 0) {
            
            var imageUrl = "http://placekitten.com/g/" + Number(values[1]) + "/" + Number(values[2]);
            
            var message = {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "elements": [{
                            "title": "Kitten",
                            "subtitle": "Cute kitten picture",
                            "image_url": imageUrl ,
                            "buttons": [{
                                "type": "web_url",
                                "url": imageUrl,
                                "title": "Show kitten"
                                }, {
                                "type": "postback",
                                "title": "I like this",
                                "payload": "User " + recipientId + " likes kitten " + imageUrl,
                            }]
                        }]
                    }
                }
            };
    
            sendMessage(recipientId, message);
            
            return true;
        }
    }
    
    return false;
    
};

// send rich message with kitten
function witMessage(recipientId, text) {
	var html = '<html><body></body></html>';
	console.log("inside witMessage text:" + text);
  jsdom.env({
    html: html,
    scripts: ['https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.js'],
    done: function storeId(err, window) {
		console.log("inside storeId text:" + recipientId);
      var $ = window.jQuery;
      $.ajax({
		url: 'https://api.wit.ai/message',
		data: {
		'q': text,
		'access_token' : accessToken
		},
		dataType: 'jsonp',
		method: 'GET',
		success: function(response) {
		  console.log("success!"+ JSON.stringify(response));
		  sendMessage(recipientId, response);
		},
		error: function(response){
			console.log("ERROR!"+ JSON.stringify(response));
		}
	});
    }
  });
  
};

/*if (require.main === module) {
  console.log("Bot testing mode.="+actions);
  const client = new Wit({accessToken, actions});
  interactive(client);
}else {
    console.log('required as a module');
	  const client = new Wit({accessToken, actions});
	interactive(client);
}*/