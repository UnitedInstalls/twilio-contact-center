'use strict'

const twilio = require('twilio')

/* client for Twilio TaskRouter */
const taskrouterClient = new twilio.TaskRouterClient(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN,
	process.env.TWILIO_WORKSPACE_SID)

module.exports.welcome = function (req, res) {
	var twiml = new twilio.TwimlResponse()

	twiml.gather({
		//action: 'select-team',
		action: 'directory',
		method: 'GET',
		numDigits: 1,
		timeout: 10
	}, function (gatherNode) {
		gatherNode.say(getGreeting())
		//gatherNode.say(req.configuration.ivr.text)
	})

	res.setHeader('Content-Type', 'application/xml')
	res.setHeader('Cache-Control', 'public, max-age=0')
	res.send(twiml.toString())

	console.log(twiml.toString())
}

module.exports.directory = function (req, res) {
	var twiml = new twilio.TwimlResponse()

	twiml.gather({
		action: 'redirect',
		method: 'GET',
		numDigits: 1,
		timeout: 10
	}, function (gatherNode) {
		gatherNode.say('Press 5 to be forwarded to The University of Cincinnati, press 6 to enter another number, or press 0 to continue to team selection.')
	})

	res.setHeader('Content-Type', 'application/xml')
	res.setHeader('Cache-Control', 'public, max-age=0')
	res.send(twiml.toString())

	console.log(twiml.toString())
}

module.exports.redirect = function (req, res) {
	var selection = null;
	
	selection = +req.query.Digits

	var twiml = new twilio.TwimlResponse()

	if (selection != 5 && selection != 0 && selection != 6) {
		twiml.say('Your selection was not valid, please try again')
		twiml.pause({length: 2})
		twiml.redirect({ method: 'GET' }, 'directory')
	} else if (selection == 0) {
		twiml.redirect({ method: 'GET' }, 'select-team')
	} else if (selection == 5) {
		twiml.say('Now dialing The University of Cincinnati.')
		twiml.dial('5135566000')
	} else if (selection == 6) {
		twiml.gather({
			action: 'redirect-custom',
			method: 'GET',
			numDigits: 10,
			timeout: 20
		}, function (gatherNode) {
		gatherNode.say('Please enter the 10 digit number you wish to dial now.')
	})
	}
	
	res.setHeader('Content-Type', 'application/xml')
	res.setHeader('Cache-Control', 'public, max-age=0')
	res.send(twiml.toString())

	console.log(twiml.toString())
}

module.exports.redirectCustom = function (req, res) {
	var selection = null;
	
	selection = +req.query.Digits

	var twiml = new twilio.TwimlResponse()

	if (selection === null || selection.length < 10) {
		twiml.say('Your selection was not valid, please try again')
		twiml.pause({length: 2})
		twiml.redirect({ method: 'GET' }, 'directory')
	} else {
		twiml.say('Dialing.')
		twiml.dial(selection.toString())
	}

	res.setHeader('Content-Type', 'application/xml')
	res.setHeader('Cache-Control', 'public, max-age=0')
	res.send(twiml.toString())

	console.log(twiml.toString())
}

module.exports.selectTeam = function (req, res) {
	var team = null

	for (var i = 0; i < req.configuration.ivr.options.length; i++) {
		if (parseInt(req.query.Digits) === req.configuration.ivr.options[i].digit) {
			team = req.configuration.ivr.options[i]
		}
	}

	var twiml = new twilio.TwimlResponse()

	/* the caller pressed a key that does not match any team */
	if (team === null) {
		// redirect the call to the previous twiml
		twiml.say('Your selection was not valid, please try again')
		twiml.pause({length: 2})
		twiml.redirect({ method: 'GET' }, 'welcome')
	} else {
		twiml.gather({
			action: 'create-task?teamId=' + team.id + '&teamFriendlyName=' + encodeURIComponent(team.friendlyName),
			method: 'GET',
			numDigits: 1,
			timeout: 5
		}, function (node) {
			node.say('Press any key if you want a callback, if you want to talk to an agent please wait in the line')
		})

		/* create task attributes */
		var attributes = {
			text: 'Caller answered IVR with option "' + team.friendlyName + '"',
			channel: 'phone',
			phone: req.query.From,
			name: req.query.From,
			title: 'Inbound call',
			type: 'inbound_call',
			team: team.id
		}

		twiml.enqueue({ workflowSid: req.configuration.twilio.workflowSid }, function (node) {
			node.task(JSON.stringify(attributes), {
				priority: 1,
				timeout: 3600
			})
		})

	}

	res.setHeader('Content-Type', 'application/xml')
	res.setHeader('Cache-Control', 'public, max-age=0')
	res.send(twiml.toString())

	console.log(twiml.toString())
}

module.exports.createTask = function (req, res) {
	/* create task attributes */
	var attributes = {
		text: 'Caller answered IVR with option "' + req.query.teamFriendlyName + '"',
		channel: 'phone',
		phone: req.query.From,
		name: req.query.From,
		title: 'Callback request',
		type: 'callback_request',
		team: req.query.teamId
	}

	taskrouterClient.workspace.tasks.create({
		WorkflowSid: req.configuration.twilio.workflowSid,
		attributes: JSON.stringify(attributes)
	}, function (err, task) {

		var twiml = new twilio.TwimlResponse()

		if (err) {
			console.log(err)
			twiml.say('An application error occured, the demo ends now')
		}  else {
			twiml.say('Thanks for your callback request, an agent will call you back a soon as possible')
			twiml.hangup()
		}

		res.setHeader('Content-Type', 'application/xml')
		res.setHeader('Cache-Control', 'public, max-age=0')
		res.send(twiml.toString())

		console.log(twiml.toString())
	})

}

/**
 * @author Alex Hall <alex.hall@united-installs.com>
 * @description Added United Installs business logic and responses
 * EDITS: 
 * 	- Alex Hall, 3.15.17, Moved code into open source Twilio Contact Center demo project
 */
const holidayResponse = 'THANK YOU FOR CALLING UNITED INSTALLS, YOU HAVE REACHED US DURING A HOLIDAY. THERE IS A POSSIBILITY THAT SOMEONE MAY BE IN THE OFFICE. IF YOU KNOW YOUR PARTIES EXTENTION YOU MAY ENTER IT AT ANY TIME. WE DO ASK THAT YOU CALL BACK AT NORMAL BUSINESS HOURS OF 8 O’CLOCK AM TO 5:00 O’CLOCK PM MONDAY THROUGH FRIDAY'
const afterHoursResponse = 'THANK YOU FOR CALLING UNITED INSTALLS, YOU HAVE REACHED US EITHER BEFORE OR AFTER NORMAL BUSINESS HOURS. THERE IS A POSSIBILITY THAT SOMEONE MAY STILL BE IN THE OFFICE. IF YOU KNOW YOUR PARTIES EXTENTION YOU MAY ENTER IT AT ANY TIME. WE DO ASK THAT YOU CALL BACK AT NORMAL BUSINESS HOURS OF 8 O’CLOCK AM TO 5 O’CLOCK PM MONDAY THROUGH FRIDAY'
const mainResponse = 'THANK YOU FOR CALLING UNITED INSTALLS YOUR INDEPENDENT SERVICE PROVIDOR FOR LOWES, TO ENSURE THE HIGHEST LEVEL OF CUSTOMER CARE THIS CALL MAY BE RECORDED. IF YOU KNOW YOUR PARTIES EXTENTION YOU MAY DIAL it AT ANY TIME. FOR FLOORING INSTALLATIONS PRESS 1, FOR KITCHEN & BATH REMODELING PRESS 2, FOR BILLING AND ACCOUNTING PRESS 3' //FOR ALL OTHER QUESTIONS PRESS 0.
const installationsResponse = 'TO SCHEDULE YOUR NEW FLOORING INSTALLATION PRESS 1, FOR QUESTIONS ABOUT YOUR SCHEDULED INSTALLATION PRESS 2, IF YOU ARE AN INSTALLATION TEAM MEMBER AND NEED ASSISSTANCE PRESS 3, IF YOU ARE AN ESTIMATOR AND NEED ASSISTANCE PRESS 4, FOR ALL OTHER QUESTIONS PLEASE PRESS 5'
const accountingResponse = 'FOR ACCOUNTS PAYABLE PRESS 1, FOR ACCOUNTS RECEIVALBLE PRESS 3, FOR INSTALLER PAYMENTS PRESS 2, FOR EMPLOYEE PAYROLL PRESS 4, FOR HUMAN RESOURCES PRESS 5'
const inQueue_1 = 'AT UNITED INSTALLS WE ARE STRIVING TO GIVE YOU WORLD CLASS SERVICE, PLEASE STAY ON THE LINE AND WE WILL BE RIGHT WITH YOU!'
const inQueue_2 = 'AT UNITED INSTALLS WE ARE FAMILY OWNED AND OPERATER, YOUR WORD OF MOUTH AND SATISFACTION IS OUR JOB SECURITY!'

let date = new Date()

/**
* @function getGreeting
* @description returns the correct response to be played back to the caller based on the date and time of day
* @returns {String}
*/
function getGreeting() {
  if (IsHoliday()) { return holidayResponse }
  else if (IsWeekend()) { return afterHoursResponse } // if weekend we are not here no matter the hour
  else if (IsBusinessHours()) { return mainResponse } // if the users are here
  else { return afterHoursResponse }
}

function getInstallationsResponse() { return installationsResponse }

function getAccountingResponse() { return accountingResponse }

function IsHoliday() {
  return false // TODO
}

function IsWeekend() {
  if (date.getDay() == 0
      || date.getDay() == 6) 
      {
        return true
      }
      else {
        return false
      }
}

function IsBusinessHours() {
  if (date.getHours() >= 8
      && date.getHours() < 17) 
      { 
        return true
      }
      else {
        return false
      }
}