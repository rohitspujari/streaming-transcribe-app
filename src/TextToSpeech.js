import Amplify, { Storage, Predictions } from 'aws-amplify';
import { AmazonAIPredictionsProvider } from '@aws-amplify/predictions';
import React, { useState } from 'react';

function generateTextToSpeech(text, speaker) {
  //setResponse('Generating audio...');
  Predictions.convert({
    textToSpeech: {
      source: {
        text: text
      },
      voiceId: speaker
      //voiceId: 'Aditi' // default configured on aws-exports.js
      // list of different options are here https://docs.aws.amazon.com/polly/latest/dg/voicelist.html
    }
  })
    .then(result => {
      let AudioContext = window.AudioContext || window.webkitAudioContext;
      //console.log({ AudioContext });
      const audioCtx = new AudioContext();
      const source = audioCtx.createBufferSource();
      audioCtx.decodeAudioData(
        result.audioStream,
        buffer => {
          source.buffer = buffer;
          source.connect(audioCtx.destination);
          source.start(0);
        },
        err => console.log({ err })
      );

      //setResponse(`Generation completed, press play`);
    })
    .catch(err => console.log(err));
}

export default generateTextToSpeech;
