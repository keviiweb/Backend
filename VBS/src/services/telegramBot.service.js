const TelegramBot = require("node-telegram-bot-api");
const { TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_CHANNEL_ID } = require("../config");
const {
  timingSlotNumberToTimingMapping,
} = require("../constants/slotNumberToTimingMapping");
const { convertUnixToDateString } = require("../utils/dateToUnix");

const token = TELEGRAM_BOT_TOKEN;
const channel_id = TELEGRAM_BOT_CHANNEL_ID;

const bot = new TelegramBot(token, { polling: true });

const sendMessageToChannel = (message) => {
  console.log("SEND MESSAGE TO TELEGRAM CHANNEL");
  
  bot.sendMessage(channel_id, message).catch((err) => {
    console.log("Channel message not sent", err);
  });
};

/*
const venueBookingRequestMessageBuilder = (bookingRequest) => {
  const { email, notes } = bookingRequest;
  const venueName = bookingRequest.venue.name;
  const date = convertUnixToDateString(bookingRequest.date);
  const timeSlots = bookingRequest.timingSlots.map(
    (timeSlot) => timingSlotNumberToTimingMapping[timeSlot]
  );
  const cca = bookingRequest.cca || "Personal";

  const returnMessage = `[BOOKING REQUEST]\nEmail: ${email}\ncca: ${cca}\nvenueName: ${venueName}\ndate: ${date}\ntimeSlots: ${timeSlots}\nnotes: ${notes} `;

  return returnMessage;
};
*/

const approvalBookingRequestMessageBuilder = (bookingRequest) => {
  const { email, notes } = bookingRequest;
  const venueName = bookingRequest.venue.name;
  const date = convertUnixToDateString(bookingRequest.date);
  const timeSlots = bookingRequest.timingSlots.map(
    (timeSlot) => timingSlotNumberToTimingMapping[timeSlot]
  );
  const cca = bookingRequest.cca || "Personal";
  
  let hide = email.split("@")[0].length - 5;//<-- number of characters to hide
  var r = new RegExp(".{"+hide+"}@", "g")
  const masked_email = email.replace(r, "***@" );
  
  const returnMessage = `[APPROVED]\nEmail: ${masked_email}\ncca: ${cca}\nvenueName: ${venueName}\ndate: ${date}\ntimeSlots: ${timeSlots}`;

  return returnMessage;
	
}

const rejectBookingRequestMessageBuilder = (bookingRequest) => {
  const { email, notes } = bookingRequest;
  const venueName = bookingRequest.venue.name;
  const date = convertUnixToDateString(bookingRequest.date);
  const timeSlots = bookingRequest.timingSlots.map(
    (timeSlot) => timingSlotNumberToTimingMapping[timeSlot]
  );
  const cca = bookingRequest.cca || "Personal";

  let hide = email.split("@")[0].length - 5;//<-- number of characters to hide
  var r = new RegExp(".{"+hide+"}@", "g")
  const masked_email = email.replace(r, "***@" );
  
  const returnMessage = `[REJECTED]\nEmail: ${masked_email}\ncca: ${cca}\nvenueName: ${venueName}\ndate: ${date}\ntimeSlots: ${timeSlots}`;

  return returnMessage;
	
}

const instantBookingRequestMessageBuilder = (bookingRequest) => {
  const { email, notes } = bookingRequest;
  const venueName = bookingRequest.venue.name;
  const date = convertUnixToDateString(bookingRequest.date);
  const timeSlots = bookingRequest.timingSlots.map(
    (timeSlot) => timingSlotNumberToTimingMapping[timeSlot]
  );
  const cca = bookingRequest.cca || "Personal";

  let hide = email.split("@")[0].length - 5;//<-- number of characters to hide
  var r = new RegExp(".{"+hide+"}@", "g")
  const masked_email = email.replace(r, "***@" );
  
  const returnMessage = `[INSTANT APPROVAL]\nEmail: ${masked_email}\ncca: ${cca}\nvenueName: ${venueName}\ndate: ${date}\ntimeSlots: ${timeSlots}`;

  return returnMessage;
};

module.exports = {
  sendMessageToChannel,
  //venueBookingRequestMessageBuilder,
  approvalBookingRequestMessageBuilder,
  rejectBookingRequestMessageBuilder,
  instantBookingRequestMessageBuilder,
};
