const url = new URL(window.location.href);
const appSettings = {
  event: url.searchParams.get("event") || 'demo_events',
  phoneNumber: url.searchParams.get("phone") || '312-313-4664',
  twitterHandle: url.searchParams.get("twitter") || '@GoogleCloud'
}

var wrapper = document.getElementById('wrapper');
//var footerHeight = document.getElementById('bannerImg').offsetHeight;
var footerHeight = 105;
var maxX = wrapper.offsetWidth;
var maxY = wrapper.offsetHeight - footerHeight;
console.log('maxX', maxX);
console.log('maxY', maxY);

document.addEventListener('DOMContentLoaded', function() {
  var ph = document.querySelector('#phoneNumber');
  ph.innerText = appSettings.phoneNumber;
  document.querySelector('#twitterHandle').innerText = appSettings.twitterHandle;
});

var db = firebase.database();
db.ref('sms').child(appSettings.event).on('child_added', snapshot => {
  console.log('child added');
  let val = snapshot.val();
  console.log(val);
  console.log(val.emoji);
  if (val.emoji) {
    placeRandom(val.emoji, 'emoji');
  }
  if (val.tokens) {
    // Words is a per-message list of nouns and adjectives, co we can
    // randomly choose one adj/noun per message.
    let words = [];
    for(let i=0; i<val.tokens.length; i++) {
      let token = val.tokens[i];
      let tag = token.partOfSpeech.tag;
      // console.log(token);
      // console.log(tag);
      // console.log(token.lemma);
      if (tag == 'NOUN' || tag == 'ADJ') {
        words.push(token.lemma);
      }
    }
    if (words.length) {
      var randomWord = words[Math.floor(Math.random() * words.length)];
      placeRandom(randomWord, 'word');
    }
  }
});

function placeRandom(text, cssClass) {
  let x = Math.floor(Math.random() * (maxX - 50));
  let y = Math.floor(Math.random() * (maxY - 35));

  var displayItem = document.createElement('div');
  var t = document.createTextNode(text);
  displayItem.className = 'displayItem';
  if (cssClass) {
    displayItem.className += ' ' + cssClass;
  }
  displayItem.style.top = y + 'px';
  displayItem.style.left = x + 'px';
  displayItem.appendChild(t);
  wrapper.appendChild(displayItem); 
}
