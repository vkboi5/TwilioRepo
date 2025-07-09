import express, { Router } from 'express';
import { Server as HttpServer } from 'http';
import { WebSocket, Server as WebSocketServer } from 'ws';
import type { ServerConfig } from './common/types';
import { createTokenRoute } from './routes/token';
import { createTwimlRoute } from './routes/twiml';
import { createLogMiddleware } from './middlewares/log';
import { auth } from 'express-oauth2-jwt-bearer';
import Twilio from 'twilio';
import { twiml } from 'twilio';

export function createExpressApp(serverConfig: ServerConfig) {
  const app = express();

  const jwtCheck = auth({
    audience: serverConfig.AUTH0_AUDIENCE,
    issuerBaseURL: serverConfig.AUTH0_ISSUER_BASE_URL,
  });

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.set('trust proxy', 1);
  app.use(createLogMiddleware());

  const tokenRouter = Router();
  tokenRouter.use(createTokenRoute(serverConfig));
  app.post('/token', jwtCheck, tokenRouter);

  const twimlRouter = Router();
  twimlRouter.use(createTwimlRoute(serverConfig));
  app.post('/twiml', twimlRouter);

  app.get('/', (req, res) => res.status(200).send('Server is healthy'));

  // Updated /resume endpoint to continue transcription
  app.post('/resume', (req, res) => {
    const twimlResponse = new twiml.VoiceResponse();
    const start = twimlResponse.start();
    start.transcription({
      languageCode: 'en-US',
      statusCallbackUrl:
        `${serverConfig.DEFAULT_URL}/transcription`,
    });
    twimlResponse.pause({ length: 1 });
    twimlResponse.redirect({ method: 'POST' }, '/resume');
    console.log('Resume TwiML:', twimlResponse.toString());
    res
      .header('Content-Type', 'text/xml')
      .status(200)
      .send(twimlResponse.toString());
  });

  const wsClients: WebSocket[] = [];

  app.post('/transcription', (req, res) => {
    console.log('Transcription result received:', req.body);
    const transcriptionData = req.body.TranscriptionData;
    if (transcriptionData) {
      try {
        const parsedData = JSON.parse(transcriptionData);
        const transcriptionText = parsedData.transcript;
        if (transcriptionText) {
          console.log('Transcription Text:', transcriptionText);
          wsClients.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  transcription: transcriptionText,
                  sequenceId: req.body.SequenceId, 
                }),
              );
            }
          });
        }
      } catch (error) {
        console.error('Error parsing TranscriptionData:', error);
      }
    } else {
      console.log('No TranscriptionData found in request body.');
    }
    res.status(200).send('');
  });

  const twilioClient = Twilio(
    serverConfig.ACCOUNT_SID,
    serverConfig.AUTH_TOKEN,
  );

  const server = new HttpServer(app);
  const wss = new WebSocketServer({
    server,
    path: '/transcription',
  });

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    wsClients.push(ws);

    ws.on('message', async (message) => {
      const data = JSON.parse(message.toString());
      if (data.type === 'tts' && data.text && data.callSid) {
        try {
          const call = await twilioClient.calls(data.callSid).fetch();
          const parentCallSid = call.parentCallSid;
          let recipientCallSid = data.callSid;

          if (!parentCallSid) {
            const calls = await twilioClient.calls.list({
              parentCallSid: data.callSid,
              limit: 1,
            });
            if (calls.length > 0) {
              recipientCallSid = calls[0].sid;
            } else {
              console.error('No child call found for TTS');
              return;
            }
          }

          const twimlResponse = new twiml.VoiceResponse();
          twimlResponse.say(
            {
              voice: 'Polly.Joanna',
              language: 'en-US',
            },
            data.text,
          );
          twimlResponse.redirect(
            { method: 'POST' },
            `${serverConfig.DEFAULT_URL}/resume`,
          );

          await twilioClient.calls(recipientCallSid).update({
            twiml: twimlResponse.toString(),
          });
          console.log(`TTS sent to call ${recipientCallSid}: ${data.text}`);
        } catch (error) {
          console.error('Failed to send TTS:', error);
        }
      }
    });

    ws.on('close', (code, reason) => {
      console.log('WebSocket closed', { code, reason });
      const index = wsClients.indexOf(ws);
      if (index !== -1) wsClients.splice(index, 1);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return server;
}
