/* eslint-disable @typescript-eslint/no-explicit-any */
import { twiml } from 'twilio';
import { createTwimlRoute } from '../../routes/twiml';
import { NextFunction, Request, Response } from 'express';

jest.mock('../../utils/log');

const mockedVoiceResponse = jest.mocked(twiml.VoiceResponse);

const mockServerConfig = {
  ACCOUNT_SID: 'mock-twiliocredentials-accountsid',
  AUTH_TOKEN: 'mock-twiliocredentials-authtoken',
  API_KEY_SID: 'mock-twiliocredentials-apikeysid',
  API_KEY_SECRET: 'mock-twiliocredentials-apikeysecret',
  TWIML_APP_SID: 'mock-twiliocredentials-outgoingapplicationsid',
  CALLER_ID: 'mock-twiliocredentials-phonenumber',
  APN_PUSH_CREDENTIAL_SID: 'mock-twiliocredentials-apnpushcredentialsid',
  FCM_PUSH_CREDENTIAL_SID: 'mock-twiliocredentials-fcmpushcredentialsid',
  AUTH0_AUDIENCE: 'mock-auth0-audience',
  AUTH0_ISSUER_BASE_URL: 'mock-auth0-issuer-base-url',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createTwimlRoute()', () => {
  it('returns a route function', () => {
    const twimlRoute = createTwimlRoute(mockServerConfig);
    expect(typeof twimlRoute).toBe('function');
  });

  describe('twimlRoute()', () => {
    let twimlRoute: ReturnType<typeof createTwimlRoute>;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: jest.MockedFunction<NextFunction>;

    beforeEach(() => {
      twimlRoute = createTwimlRoute(mockServerConfig);
      mockReq = {
        headers: {
          'x-twilio-signature': 'mock-x-twilio-signature',
        },
        body: {
          To: 'mock-req-to-foobar',
          recipientType: 'client',
        },
        query: {}, // Added for completeness
      };
      mockRes = {
        header: jest.fn().mockReturnThis(),
        locals: {},
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      };
      mockNext = jest.fn();
    });

    it('responds with status code 400 if "To" is missing', () => {
      mockReq.body!.To = undefined;

      twimlRoute(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith('Missing "To".');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('responds with status code 400 if "recipientType" is invalid', () => {
      mockReq.body!.recipientType = undefined;

      twimlRoute(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith('Invalid "recipientType".');
      expect(mockNext).not.toHaveBeenCalled();
    });

    describe('when all body values are present', () => {
      it('constructs a voice response', () => {
        twimlRoute(mockReq as Request, mockRes as Response, mockNext);
        expect(mockedVoiceResponse).toHaveBeenCalledTimes(1);
        expect(mockedVoiceResponse).toHaveBeenCalledWith();
      });

      it('dials a client', () => {
        mockReq.body!.recipientType = 'client';
        twimlRoute(mockReq as Request, mockRes as Response, mockNext);

        const mockVoiceResponse = mockedVoiceResponse.mock.results[0].value;
        expect(mockVoiceResponse.dial).toHaveBeenCalledWith({
          answerOnBridge: true,
          callerId: undefined, // Since From is not set
        });
        expect(mockVoiceResponse.dial.mock.results[0].value.client).toHaveBeenCalledWith(mockReq.body!.To);
      });

      it('dials a number', () => {
        mockReq.body!.recipientType = 'number';
        twimlRoute(mockReq as Request, mockRes as Response, mockNext);

        const mockVoiceResponse = mockedVoiceResponse.mock.results[0].value;
        expect(mockVoiceResponse.dial).toHaveBeenCalledWith({
          answerOnBridge: true,
          callerId: 'mock-twiliocredentials-phonenumber',
        });
        expect(mockVoiceResponse.dial.mock.results[0].value.number).toHaveBeenCalledWith(mockReq.body!.To);
      });

      it('responds with twiml', () => {
        twimlRoute(mockReq as Request, mockRes as Response, mockNext);

        const mockVoiceResponse = mockedVoiceResponse.mock.results[0].value;
        expect(mockVoiceResponse.toString).toHaveBeenCalledTimes(1);
        const toStringRes = mockVoiceResponse.toString.mock.results[0].value;

        expect(mockRes.header).toHaveBeenCalledWith('Content-Type', 'text/xml');
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.send).toHaveBeenCalledWith(toStringRes);
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });
});