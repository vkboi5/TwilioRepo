import express, { Router } from 'express';
import { Server as HttpServer } from 'http';
import { WebSocket, Server as WebSocketServer } from 'ws';
import type { ServerConfig } from './common/types';
import { createTokenRoute } from './routes/token';
import { createTwimlRoute } from './routes/twiml';
import { createLogMiddleware } from './middlewares/log';
import { auth } from 'express-oauth2-jwt-bearer';

export function createExpressApp(serverConfig: ServerConfig) {
  const app = express();

  const jwtCheck = auth({
    audience: serverConfig.AUTH0_AUDIENCE,
    issuerBaseURL: serverConfig.AUTH0_ISSUER_BASE_URL,
  });

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  /**
   * Configure the following line according to your environment, development or
   * production.
   */
  app.set('trust proxy', 1);

  app.use(createLogMiddleware());

  const tokenRouter = Router();
  tokenRouter.use(createTokenRoute(serverConfig));
  app.post('/token', jwtCheck, tokenRouter);

  const twimlRouter = Router();
  twimlRouter.use(createTwimlRoute(serverConfig));
  app.post('/twiml', twimlRouter);

  app.get('/', (req, res) => res.status(200).send('Server is healthy'));

  // Set up an array to track connected WebSocket clients
  const wsClients: WebSocket[] = [];

  // Handle transcription results from Twilio
  app.post('/transcription', (req, res) => {
    console.log('Transcription result received:', req.body);
  
    // Check for the 'TranscriptionData' field, and parse the transcript from it
    const transcriptionData = req.body.TranscriptionData;
    if (transcriptionData) {
      // Parse the transcription data to extract the actual text
      try {
        const parsedData = JSON.parse(transcriptionData);
        const transcriptionText = parsedData.transcript;
  
        if (transcriptionText) {
          console.log('Transcription Text:', transcriptionText);
  
          // Broadcast transcription to all connected WebSocket clients
          wsClients.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ transcription: transcriptionText }));
            }
          });
        } else {
          console.log('No transcript found in TranscriptionData.');
        }
      } catch (error) {
        console.error('Error parsing TranscriptionData:', error);
      }
    } else {
      console.log('No TranscriptionData found in request body.');
    }
  
    // Respond to Twilio (Twilio expects an empty response)
    res.status(200).send('');
  });

  // Create HTTP server instance
  const server = new HttpServer(app);

  // Create WebSocket server
  const wss = new WebSocketServer({
    server,
    path: '/transcription', // WebSocket connection path
  });

  // WebSocket logic for live transcription
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    wsClients.push(ws);

    ws.on('close', (code, reason) => {
      console.log('WebSocket closed', { code, reason });
      // Remove closed client from the list
      const index = wsClients.indexOf(ws);
      if (index !== -1) wsClients.splice(index, 1);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return server;
}
