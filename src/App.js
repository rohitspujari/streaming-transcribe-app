import React, { useState, useEffect, useReducer, useRef } from 'react';
import './App.css';
import {
  FormControlLabel,
  FormGroup,
  LinearProgress,
  Typography
} from '@material-ui/core';
import Switch from '@material-ui/core/Switch';

import { useAuth, AuthUI, withAuth, UserContext } from './Auth';
import { Auth } from 'aws-amplify';
import Predictions, {
  AmazonAIPredictionsProvider
} from '@aws-amplify/predictions';

import Amplify from 'aws-amplify';

import * as audioUtils from './lib/audioUtils'; // for encoding audio data as PCM
import crypto from 'crypto'; // tot sign our pre-signed URL
import * as v4 from './lib/aws-signature-v4'; // to generate our pre-signed URL
import { EventStreamMarshaller } from '@aws-sdk/eventstream-marshaller'; // for converting binary event stream messages to and from JSON
import * as util_utf8_node from '@aws-sdk/util-utf8-node'; // utilities for encoding and decoding UTF8
import mic from 'microphone-stream'; // collect microphone input as a stream of raw bytes
import { TextField, Grid, makeStyles, Button, Fab } from '@material-ui/core';
import MicIcon from '@material-ui/icons/Mic';
import StopIcon from '@material-ui/icons/Stop';
import { generateTextToSpeech, getTranslation } from './lib/aiUtils';
import NativeSelects from './components/NativeSelects';

// our converter between binary event streams messages and JSON
Amplify.addPluggable(new AmazonAIPredictionsProvider());

const LANGUAGES = [
  { language: 'Hindi', languageCode: 'hi', speaker: 'Aditi' },
  { language: 'German', languageCode: 'de', speaker: 'Hans' },
  { language: 'Korean', languageCode: 'ko', speaker: 'Seoyeon' },
  { language: 'Italian', languageCode: 'it', speaker: 'Carla' },
  { language: 'Arabic', languageCode: 'ar', speaker: 'Zeina' },
  { language: 'Chinese', languageCode: 'zh', speaker: 'Zhiyu' },
  { language: 'French', languageCode: 'fr', speaker: 'Celine' },
  { language: 'Polish', languageCode: 'pl', speaker: 'Ewa' },
  { language: 'Russian', languageCode: 'ru', speaker: 'Tatyana' },
  { language: 'Spanish', languageCode: 'es', speaker: 'Conchita' }
];

const eventStreamMarshaller = new EventStreamMarshaller(
  util_utf8_node.toUtf8,
  util_utf8_node.fromUtf8
);

// our global variables for managing state

let destlan;
let spkr;
let eblspkr = true;
let languageCode;
let sampleRate;
let socket;
let micStream;
let socketError = false;
let transcribeException = false;
let AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

const useStyles = makeStyles(theme => ({
  container: {
    display: 'flex',
    padding: 10,
    marginTop: 10
  },
  input: {
    alignItems: 'flex-start',
    height: window.innerHeight / 4.5
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
    case 'error':
      return {
        ...state,
        error: action.payload,
        isPartial: false,
        partialTranscript: '',
        partialTranslate: '',
        isTranscribing: false
      };
  }
};

const App = () => {
  const [destinationLanguage, setDestinationLanguage] = useState('hi');
  const [speaker, setSpeaker] = useState('Aditi');
  const [enableSpeaker, setEnableSpeaker] = useState(true);

  const [
    {
      transcription,
      partialTranscript,
      translation,
      partialTranslate,
      isPartial,
      resultId,
      isTranscribing,
      error
    },
    dispatch
  ] = useReducer(reducer, {
    transcription: '',
    translation: '',
    isTranscribing: false
  });

  const credentialsRef = useRef();
  const transcribeFieldRef = useRef(null);
  const translateFieldRef = useRef(null);
  const classes = useStyles();

  const getCurrentCredentials = async () => {
    const {
      data: { Credentials }
    } = await Auth.currentCredentials();

    credentialsRef.current = Credentials;
  };

  useEffect(() => {
    //transcribeFieldRef.current.scrollTop = transcribeFieldRef.current.scrollHeight;
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

  let streamAudioToWebSocket = userMediaStream => {
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

  const wireSocketEvents = () => {
    // handle inbound messages from Amazon Transcribe
    //console.log(destinationLanguage, speaker, enableSpeaker);
    socket.onmessage = message => {
      //convert the binary event stream message to JSON
      let messageWrapper = eventStreamMarshaller.unmarshall(
        Buffer(message.data)
      );
      let messageBody = JSON.parse(
        String.fromCharCode.apply(String, messageWrapper.body)
      );
      if (messageWrapper.headers[':message-type'].value === 'event') {
        //console.log(destinationLanguage, speaker, enableSpeaker);
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
  };

  const handleEventStreamMessage = async messageJson => {
    let results = messageJson.Transcript.Results;
    if (results.length > 0) {
      if (results[0].Alternatives.length > 0) {
        let transcript = results[0].Alternatives[0].Transcript;

        // fix encoding for accented characters
        transcript = decodeURIComponent(escape(transcript));
        // update the textarea with the latest result
        //console.log(transcript, 'Partial Results: ' + results[0].IsPartial);

        if (results[0].IsPartial) {
          dispatch({
            type: 'partial',
            payload: { transcript, resultId: results[0].ResultId }
          });
        }
        // if this transcript segment is final, add it to the overall transcription
        if (!results[0].IsPartial) {
          //scroll the textarea down
          //$('#transcript').scrollTop($('#transcript')[0].scrollHeight);

          const translate = await getTranslation(
            transcript,
            destlan //substituting with global variable
            //destinationLanguage
          );

          dispatch({
            type: 'final',
            payload: { transcript, translate, resultId: results[0].ResultId }
          });

          if (eblspkr) {
            //generateTextToSpeech(translate, speaker, audioCtx);
            generateTextToSpeech(translate, spkr, audioCtx); // substituting spkr global variable
          }

          // dispatch({
          //   type: 'final',
          //   payload: { transcript, translate, resultId: results[0].ResultId }
          // });

          // if (enableSpeaker) {
          //   generateTextToSpeech(translate, speaker, audioCtx); // substituting spkr global variable
          // }
          // transcription += transcript + '\n';
        }
        transcribeFieldRef.current.scrollTop =
          transcribeFieldRef.current.scrollHeight;
        translateFieldRef.current.scrollTop =
          translateFieldRef.current.scrollHeight;
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

  const handleStart = () => {
    //$('#error').hide(); // hide any existing errors
    //toggleStartStop(true); // disable start and enable stop button

    dispatch({ type: 'start' });

    // set the language and region from the dropdowns
    setLanguage();
    // first we get the microphone input from the browser (as a promise)...
    window.navigator.mediaDevices
      .getUserMedia({
        video: false,
        audio: true
      })
      // ...then we convert the mic stream to binary event stream messages when the promise resolves
      .then(streamAudioToWebSocket)
      .catch(err => {
        showError(
          'There was an error streaming your audio to Amazon Transcribe. Please try again.'
        );
      });
  };

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
    const region = 'us-east-1';
    const endpoint = 'transcribestreaming.' + region + '.amazonaws.com:8443';
    const { AccessKeyId, SecretKey, SessionToken } = credentialsRef.current;

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
        key: AccessKeyId,
        secret: SecretKey,
        sessionToken: SessionToken,
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

  function toggleStartStop(disableStart = false) {
    // $('#start-button').prop('disabled', disableStart);
    // $('#stop-button').attr("disabled", !disableStart);
  }

  function showError(message) {
    // $('#error').html('<i class="fa fa-times-circle"></i> ' + message);
    // $('#error').show();
    dispatch({ type: 'error', payload: message });
    console.log(message);
  }

  return (
    <div className="App">
      <Grid container spacing={1} className={classes.container}>
        {/* <Grid item xs={12} container justify="flex-start">
          <Typography
            style={{ marginTop: 20, marginBottom: 20 }}
            variant="h6"
            gutterBottom
          >
            Speaking in Tounges
          </Typography>
        </Grid> */}
        <Grid item xs={12} sm={6}>
          <NativeSelects
            label={'Source'}
            options={[{ language: 'English', languageCode: 'en' }]}
            disabled
            value={'en'}
          />
          <TextField
            //style={{ padding: 10 }}
            //className={classes.textBox}
            //flex
            //disabled
            //wrap="nowrap"
            variant="outlined"
            fullWidth
            inputRef={transcribeFieldRef}
            value={
              isPartial
                ? transcription + partialTranscript + '\n'
                : transcription
            }
            margin="normal"
            label="Transcription"
            multiline
            rowsMax="7"
            InputProps={{
              className: classes.input,
              readOnly: true
            }}
            InputLabelProps={{
              shrink: true
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Grid
            container
            spacing={2}
            alignItems="center"
            //justify="space-between"
          >
            <Grid
              style={
                {
                  // backgroundColor: 'red'
                }
              }
              item
              xs={6}
            >
              <NativeSelects
                label={'Target'}
                //disabled={isTranscribing}
                //value={}
                options={LANGUAGES}
                value={destinationLanguage}
                onChange={e => {
                  spkr = LANGUAGES.find(f => f.languageCode === e.target.value)
                    .speaker;

                  destlan = e.target.value;

                  setSpeaker(
                    LANGUAGES.find(f => f.languageCode === e.target.value)
                      .speaker
                  );

                  setDestinationLanguage(e.target.value);
                }}
              />
            </Grid>
            <Grid item xs={6} container justify="flex-end">
              <FormGroup row>
                <FormControlLabel
                  control={
                    <Switch
                      //disabled={isTranscribing}
                      checked={enableSpeaker}
                      onChange={() => {
                        setEnableSpeaker(!enableSpeaker);
                        eblspkr = !enableSpeaker;
                      }}
                      //color="default"
                    />
                  }
                  label="Speech"
                />
              </FormGroup>
            </Grid>
          </Grid>
          <TextField
            //className={classes.textBox}
            //flex
            //disabled
            variant="outlined"
            inputRef={translateFieldRef}
            fullWidth
            value={translation}
            margin="normal"
            label="Translation"
            multiline
            rowsMax="7"
            InputProps={{
              className: classes.input,
              readOnly: true
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

            // isTranscribing
            //   ? dispatch({ type: 'stop' })
            //   : dispatch({ type: 'start' });
          }}
        >
          {isTranscribing ? <StopIcon /> : <MicIcon />}
        </Fab>
        <Typography style={{ marginTop: 10 }}>
          {isTranscribing ? 'Tap to Stop' : 'Tap to Speak'}
        </Typography>
      </div>
    </div>
  );
};

export default withAuth(App);
