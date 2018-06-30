const url = new URL(window.location.href);
const appSettings = {
  eventName: url.searchParams.get("event"),
  phoneNumber: url.searchParams.get("phone") || '(312) 313-4664',
  twitterHandle: url.searchParams.get("twitter") || '@GoogleCloud'
}

// If an event wasn't explicitly set in the URL, use the phone number
// as the event name, in the format +19998887777.
if (!appSettings.eventName) {
  let ph = appSettings.phoneNumber;
  // If no country code supplied, prepend +1 (assume US).
  console.log('ph.indexOf("+")', ph.indexOf("+"));
  if (ph.indexOf("+") == -1) {
    ph = "+1" + ph;
  }
  // Remove everything except digits and + (for country code);
  ph = ph.replace(/[^\d\+]/g,'');
  console.log(ph);
  appSettings.eventName = ph;
}
console.log('Event name:', appSettings.eventName);

var wrapper = document.getElementById('emojis');
//var footerHeight = document.getElementById('bannerImg').offsetHeight;
var footerHeight = 105;
var maxX = wrapper.offsetWidth;
// var maxY = document.defaultView.getComputedStyle(wrapper).height;
var maxY = wrapper.offsetHeight - footerHeight;
var maxY = wrapper.offsetHeight;
console.log('maxX', maxX);
console.log('maxY', maxY);

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOMContentLoaded');
  const resetVisualizer = firebase.functions().httpsCallable('resetVisualizer');

  var ph = document.querySelector('#phoneNumber');
  ph.innerText = appSettings.phoneNumber;
  document.querySelector('#twitterHandle').innerText = appSettings.twitterHandle;
  document.querySelector('#twitterHandle').addEventListener('click', e => {
    console.log(`Resetting event ${appSettings.eventName}`);
    resetVisualizer({eventName: appSettings.eventName}).then(function(result) {
      console.log(result.data);
      location.reload();
    }).catch(e => {
      console.error(e);
    });;
  });
});

var db = firebase.database();
db.ref('/messages').child(appSettings.eventName).on('child_added', snapshot => {
  console.log('child added');
  let val = snapshot.val();
  console.log(val);
  if (val.imageUrl) {
    placeRandomImage(val.imageUrl);
  }
  if (val.emoji) {
    placeRandomText(val.emoji, 'emoji');
  }
  if (val.tokens) {
    // Words is a per-message list of nouns and adjectives, co we can
    // randomly choose one adj/noun per message.
    let words = [];
    for(let i=0; i<val.tokens.length; i++) {
      let token = val.tokens[i];
      let tag = token.partOfSpeech.tag;
      if (tag == 'NOUN' || tag == 'ADJ') {
        words.push(token.lemma);
      }
    }
    if (words.length) {
      var randomWord = words[Math.floor(Math.random() * words.length)];
      placeRandomText(randomWord, 'word');
    }
  }
});

function getRandomXY() {
  let minY = -70;
  let maxY = wrapper.offsetHeight + 200;
  return {
    x: Math.floor(Math.random() * (maxX - 50)),
    y: Math.floor((Math.random() * maxY) + minY)
  };
  // return ( { x: Math.floor(Math.random() * (maxX - 50)), y: 0 } );
}

function placeRandomImage(url) {
  let cssClass = 'emojiMeImage';
  let coord = getRandomXY();

  var displayItem = document.createElement('div');
  var i = document.createElement("img");
  i.src = url;
  displayItem.className = 'displayItem';
  if (cssClass) {
    displayItem.className += ' ' + cssClass;
  }
  displayItem.style.top = coord.y + 'px';
  displayItem.style.left = coord.x + 'px';
  displayItem.appendChild(i);
  wrapper.appendChild(displayItem); 
}

function placeRandomText(text, cssClass) {
  let coord = getRandomXY();

  var displayItem = document.createElement('div');
  var t = document.createTextNode(text);
  displayItem.className = 'displayItem';
  if (cssClass) {
    displayItem.className += ' ' + cssClass;
  }
  displayItem.style.top = coord.y + 'px';
  displayItem.style.left = coord.x + 'px';
  displayItem.appendChild(t);
  wrapper.appendChild(displayItem); 
}
