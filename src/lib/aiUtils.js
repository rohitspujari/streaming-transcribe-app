import Amplify, { Storage, Predictions } from 'aws-amplify';
import { AmazonAIPredictionsProvider } from '@aws-amplify/predictions';
import React, { useState } from 'react';

function generateTextToSpeech(text, speaker, audioCtx) {
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
      // let AudioContext = window.AudioContext || window.webkitAudioContext;

      // //console.log({ AudioContext });
      // const audioCtx = new AudioContext();
      if (!audioCtx) console.log(window);
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

const comprehendText = async textToInterpret => {
  const result = Predictions.interpret({
    text: {
      source: {
        text: textToInterpret
      },
      type: 'ALL'
    }
  });

  return result;
};

const getTranslation = async (transcript, destinationLanguage) => {
  const { text } = await Predictions.convert({
    translateText: {
      source: {
        text: transcript,
        language: 'en'
        // language : "es" // defaults configured on aws-exports.js
        // supported languages https://docs.aws.amazon.com/translate/latest/dg/how-it-works.html#how-it-works-language-codes
      },
      targetLanguage: destinationLanguage
    }
  });

  return text;
};

export { getTranslation, generateTextToSpeech, comprehendText };
