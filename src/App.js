import React, { useState, useContext, useEffect, useReducer } from 'react';
import logo from './logo.svg';
import './App.css';
import LinearProgress from '@material-ui/core/LinearProgress';

import { useAuth, AuthUI, withAuth, UserContext } from './Auth';
import { Auth } from 'aws-amplify';
import Predictions, {
  AmazonAIPredictionsProvider
} from '@aws-amplify/predictions';

import Amplify from 'aws-amplify';
// Get the aws resources configuration parameters
import awsconfig from './aws-exports'; // if you are using Amplify CLI

import * as audioUtils from './lib/audioUtils'; // for encoding audio data as PCM
import crypto from 'crypto'; // tot sign our pre-signed URL
import * as v4 from './lib/aws-signature-v4'; // to generate our pre-signed URL
import { EventStreamMarshaller } from '@aws-sdk/eventstream-marshaller'; // for converting binary event stream messages to and from JSON
import * as util_utf8_node from '@aws-sdk/util-utf8-node'; // utilities for encoding and decoding UTF8
import mic from 'microphone-stream'; // collect microphone input as a stream of raw bytes
import { TextField, Grid, makeStyles, Button, Fab } from '@material-ui/core';
import MicIcon from '@material-ui/icons/Mic';
import StopIcon from '@material-ui/icons/Stop';
import generateTextToSpeech from './TextToSpeech';
import NativeSelects from './NativeSelects';

// our converter between binary event streams messages and JSON
Amplify.addPluggable(new AmazonAIPredictionsProvider());
const eventStreamMarshaller = new EventStreamMarshaller(
  util_utf8_node.toUtf8,
  util_utf8_node.fromUtf8
);

//const key = 'AKIAWYZDIV3SEICDUSMV';
//const secret = '5/AXIWIhodNO5lF2c5Vegj4LoHB7aCiVvP8BPeI2';

// our global variables for managing state
let languageCode;
let region;
let sampleRate;
//let transcription = '';
let socket;
let micStream;
let socketError = false;
let transcribeException = false;

const useStyles = makeStyles(theme => ({
  container: {
    display: 'flex',
    padding: 10
  },

  input: {
    //display: 'flex',
    //textAlign: 'justify',
    alignItems: 'flex-start',
    height: window.innerHeight / 6
  },
  linearProgress: {
    flexGrow: 1
  }
}));

const reducer = (state, action) => {
  switch (action.type) {
    case 'final':
      return {
        ...state,
        transcription: state.transcription + action.payload.transcript + '\n',
        translation: state.translation + action.payload.translate + '\n',
        resultId: action.payload.resultId,
        isPartial: false,
        partialTranscript: '',
        partialTranslate: ''
      };
    case 'partial':
      return {
        ...state,
        partialTranscript: action.payload.transcript,
        //partialTranslate: action.payload.translate,
        resultId: action.payload.resultId,
        isPartial: true
      };
    case 'start':
      return { ...state, isTranscribing: true };

    case 'stop':
      return {
        ...state,
        isPartial: false,
        partialTranscript: '',
        partialTranslate: '',
        isTranscribing: false
      };
  }
};

const App = () => {
  const [key, setKey] = useState();
  const [secret, setSecret] = useState();
  const [sessionToken, setSessionToken] = useState();
  const [destinationLanguage, setDestinationLanguage] = useState('hi');
  //const [isTranscribing, setIsTranscribing] = useState(false);
  const [
    {
      transcription,
      partialTranscript,
      translation,
      partialTranslate,
      isPartial,
      resultId,
      isTranscribing
    },
    dispatch
  ] = useReducer(reducer, {
    transcription: '',
    translation: '',
    isTranscribing: false
  });
  const classes = useStyles();

  const getCurrentCredentials = async () => {
    const {
      data: { Credentials }
    } = await Auth.currentCredentials();
    setKey(Credentials.AccessKeyId);
    setSecret(Credentials.SecretKey);
    setSessionToken(Credentials.SessionToken);
  };

  useEffect(() => {
    if (!window.navigator.mediaDevices.getUserMedia) {
      // Use our helper method to show an error on the page
      showError(
        'We support the latest versions of Chrome, Firefox, Safari, and Edge. Update your browser and try your request again.'
      );

      // maintain enabled/distabled state for the start and stop buttons
      toggleStartStop();
    }
    getCurrentCredentials();
  }, []);

  let streamAudioToWebSocket = function(userMediaStream) {
    //let's get the mic input from the browser, via the microphone-stream module
    micStream = new mic();
    micStream.setStream(userMediaStream);

    // Pre-signed URLs are a way to authenticate a request (or WebSocket connection, in this case)
    // via Query Parameters. Learn more: https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
    let url = createPresignedUrl();

    //open up our WebSocket connection
    socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';

    // when we get audio data from the mic, send it to the WebSocket if possible
    socket.onopen = function() {
      micStream.on('data', function(rawAudioChunk) {
        // the audio stream is raw audio bytes. Transcribe expects PCM with additional metadata, encoded as binary
        let binary = convertAudioToBinaryMessage(rawAudioChunk);

        if (socket.OPEN) socket.send(binary);
      });
    };

    // handle messages, errors, and close events
    wireSocketEvents();
  };

  function setLanguage() {
    languageCode = 'en-US';
    //languageCode = $('#language').find(':selected').val();
    if (languageCode == 'en-US' || languageCode == 'es-US') sampleRate = 44100;
    else sampleRate = 8000;
  }

  function setRegion() {
    region = 'us-east-1';

    // region = $('#region')
    //   .find(':selected')
    //   .val();
  }

  function wireSocketEvents() {
    // handle inbound messages from Amazon Transcribe
    socket.onmessage = function(message) {
      //convert the binary event stream message to JSON
      let messageWrapper = eventStreamMarshaller.unmarshall(
        Buffer(message.data)
      );
      let messageBody = JSON.parse(
        String.fromCharCode.apply(String, messageWrapper.body)
      );
      if (messageWrapper.headers[':message-type'].value === 'event') {
        handleEventStreamMessage(messageBody);
      } else {
        transcribeException = true;
        showError(messageBody.Message);
        toggleStartStop();
      }
    };

    socket.onerror = () => {
      socketError = true;
      showError('WebSocket connection error. Try again.');
      toggleStartStop();
    };

    socket.onclose = closeEvent => {
      micStream.stop();

      // the close event immediately follows the error event; only handle one.
      if (!socketError && !transcribeException) {
        if (closeEvent.code != 1000) {
          //showError('</i><strong>Streaming Exception</strong><br>' + closeEvent.reason);
          console.log(closeEvent.reason);
        }
        toggleStartStop();
      }
    };
  }

  const getTranslation = async transcript => {
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

  const handleEventStreamMessage = async messageJson => {
    let results = messageJson.Transcript.Results;

    if (results.length > 0) {
      if (results[0].Alternatives.length > 0) {
        let transcript = results[0].Alternatives[0].Transcript;

        //console.log(results);

        // fix encoding for accented characters
        transcript = decodeURIComponent(escape(transcript));

        //const id = results[0].ResultId
        // update the textarea with the latest result
        //$('#transcript').val(transcription + transcript + "\n");
        //console.log(transcription + transcript + '\n');
        //const translate = '';

        //const translate = await getTranslation(transcript);

        console.log(transcript, 'Partial Results: ' + results[0].IsPartial);

        if (results[0].IsPartial) {
          // if (results[0].ResultId === resultId && isPartial === false) {
          //   return;
          // }

          dispatch({
            type: 'partial',
            payload: { transcript, resultId: results[0].ResultId }
          });
        }

        // if this transcript segment is final, add it to the overall transcription
        if (!results[0].IsPartial) {
          //scroll the textarea down
          //$('#transcript').scrollTop($('#transcript')[0].scrollHeight);
          const translate = await getTranslation(transcript);
          dispatch({
            type: 'final',
            payload: { transcript, translate, resultId: results[0].ResultId }
          });
          generateTextToSpeech(translate);
          //transcription += transcript + '\n';
        }

        // .then(result => console.log(JSON.stringify(result, null, 2)))
        // .catch(err => console.log(JSON.stringify(err, null, 2)));
      }
    }
  };

  const closeSocket = () => {
    if (socket.OPEN) {
      micStream.stop();

      // Send an empty frame so that Transcribe initiates a closure of the WebSocket after submitting all transcripts
      let emptyMessage = getAudioEventMessage(Buffer.from(new Buffer([])));
      let emptyBuffer = eventStreamMarshaller.marshall(emptyMessage);
      socket.send(emptyBuffer);
      dispatch({ type: 'stop' });
    }
  };

  function toggleStartStop(disableStart = false) {
    // $('#start-button').prop('disabled', disableStart);
    // $('#stop-button').attr("disabled", !disableStart);
  }

  function showError(message) {
    // $('#error').html('<i class="fa fa-times-circle"></i> ' + message);
    // $('#error').show();

    console.log(message);
  }

  function convertAudioToBinaryMessage(audioChunk) {
    let raw = mic.toRaw(audioChunk);

    if (raw == null) return;

    // downsample and convert the raw audio bytes to PCM
    let downsampledBuffer = audioUtils.downsampleBuffer(raw, sampleRate);
    let pcmEncodedBuffer = audioUtils.pcmEncode(downsampledBuffer);

    // add the right JSON headers and structure to the message
    let audioEventMessage = getAudioEventMessage(Buffer.from(pcmEncodedBuffer));

    //convert the JSON object + headers into a binary event stream message
    let binary = eventStreamMarshaller.marshall(audioEventMessage);

    return binary;
  }

  function getAudioEventMessage(buffer) {
    // wrap the audio data in a JSON envelope
    return {
      headers: {
        ':message-type': {
          type: 'string',
          value: 'event'
        },
        ':event-type': {
          type: 'string',
          value: 'AudioEvent'
        }
      },
      body: buffer
    };
  }

  function createPresignedUrl() {
    let endpoint = 'transcribestreaming.' + region + '.amazonaws.com:8443';

    //    console.log(key, secret, sessionToken);
    // get a preauthenticated URL that we can use to establish our WebSocket
    return v4.createPresignedURL(
      'GET',
      endpoint,
      '/stream-transcription-websocket',
      'transcribe',
      crypto
        .createHash('sha256')
        .update('', 'utf8')
        .digest('hex'),
      {
        //key: 'AKIAWYZDIV3SEICDUSMV',
        //secret: '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',
        key,
        secret,
        sessionToken,
        protocol: 'wss',
        expires: 100,
        region: region,
        query:
          'language-code=' +
          languageCode +
          '&media-encoding=pcm&sample-rate=' +
          sampleRate
      }
    );
  }

  const handleStart = () => {
    //$('#error').hide(); // hide any existing errors
    //toggleStartStop(true); // disable start and enable stop button

    // set the language and region from the dropdowns
    setLanguage();
    setRegion();

    // first we get the microphone input from the browser (as a promise)...
    window.navigator.mediaDevices
      .getUserMedia({
        video: false,
        audio: true
      })
      // ...then we convert the mic stream to binary event stream messages when the promise resolves
      .then(streamAudioToWebSocket)
      .catch(function(error) {
        showError(
          'There was an error streaming your audio to Amazon Transcribe. Please try again.'
        );
        //toggleStartStop();
      });
  };

  return (
    <div className="App">
      <Grid container spacing={1} className={classes.container}>
        <Grid item xs={12} sm={6}>
          {/* <NativeSelects
            label={'Source'}
            options={[{ text: 'English', value: 'en' }]}
            disabled
            value={'en'}
          /> */}
          <TextField
            //style={{ padding: 10 }}
            //className={classes.textBox}
            //flex
            variant="outlined"
            fullWidth
            value={
              isPartial
                ? transcription + partialTranscript + '\n'
                : transcription
            }
            margin="normal"
            label="Transcription"
            multiline
            rowsMax="8"
            InputProps={{
              className: classes.input
            }}
            InputLabelProps={{
              shrink: true
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <NativeSelects
            label={'Target'}
            //value={}
            options={[
              { text: 'Hindi', value: 'hi' },
              { text: 'German', value: 'de' }
            ]}
            value={destinationLanguage}
            onChange={e => setDestinationLanguage(e.target.value)}
          />
          <TextField
            //className={classes.textBox}
            //flex
            variant="outlined"
            fullWidth
            value={translation}
            margin="normal"
            label="Translation"
            multiline
            rowsMax="8"
            InputProps={{
              className: classes.input
            }}
            InputLabelProps={{
              shrink: true
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <LinearProgress
            className={classes.linearProgress}
            color={isPartial ? 'secondary' : 'white'}
          />
        </Grid>
      </Grid>
      <div>
        <Fab
          size="large"
          color={isTranscribing ? 'secondary' : 'primary'}
          onClick={() => {
            if (!isTranscribing) {
              handleStart();
            } else {
              closeSocket();
            }
            //setIsTranscribing(!isTranscribing);
            isTranscribing
              ? dispatch({ type: 'stop' })
              : dispatch({ type: 'start' });
          }}
        >
          {isTranscribing ? <StopIcon /> : <MicIcon />}
        </Fab>
      </div>
      {/* <TextToSpeech /> */}
      {/* <TextToSpeech /> */}
    </div>
  );
};

export default withAuth(App);
