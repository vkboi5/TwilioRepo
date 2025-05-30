import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createEntityAdapter,
  createSlice,
  miniSerializeError,
  type PayloadAction,
  type SerializedError,
} from '@reduxjs/toolkit';
import { Call as TwilioCall } from '@twilio/voice-react-native-sdk';
import { match, P } from 'ts-pattern';
import {
  type CallInfo,
  getCallInfo,
  type IncomingCall,
  type OutgoingCall,
  type OutgoingCallParameters,
} from './';
import { createTypedAsyncThunk, generateThunkActionTypes } from '../../common';
import { callMap } from '../../../util/voice';
import { settlePromise } from '../../../util/settlePromise';
import { makeOutgoingCall } from './outgoingCall';
import { acceptCallInvite } from './callInvite';
import { getNavigate } from '../../../util/navigation';

const sliceName = 'activeCall' as const;

/**
 * Handle existing call action. Used when bootstrapping the app or receiving a
 * call that was accepted through the native layer.
 */
type HandleCallRejectValue =
  | {
      reason: 'ASYNC_STORAGE_GET_ITEM_REJECTED';
      error: SerializedError;
    }
  | {
      reason: 'JSON_PARSE_THREW';
      error: SerializedError;
    };
export const handleCallActionType = generateThunkActionTypes(
  `${sliceName}/handleCall`
);
export const handleCall = createTypedAsyncThunk<
  { callInfo: CallInfo; customParameters?: OutgoingCallParameters },
  { call: TwilioCall },
  { rejectValue: HandleCallRejectValue }
>(
  handleCallActionType.prefix,
  async ({ call }, { dispatch, requestId, rejectWithValue }) => {
    const callInfo = getCallInfo(call);
    callMap.set(requestId, call);

    // Handle Connected event - redirect to transcription
    call.once(TwilioCall.Event.Connected, async () => {
      const info = getCallInfo(call);
      if (typeof info.initialConnectedTimestamp === 'undefined') {
        info.initialConnectedTimestamp = Date.now();
      }
      dispatch(setActiveCallInfo({ id: requestId, info }));

      // Navigate to transcription screen
      const navigation = await getNavigate();
      navigation.navigate('Transcription Screen');
    });

    let customParameters: OutgoingCallParameters | undefined;
    if (typeof callInfo.sid === 'string') {
      const getItemResult = await settlePromise(
        AsyncStorage.getItem(callInfo.sid),
      );
      if (getItemResult.status === 'rejected') {
        return rejectWithValue({
          reason: 'ASYNC_STORAGE_GET_ITEM_REJECTED',
          error: miniSerializeError(getItemResult.reason),
        });
      }
      try {
        customParameters = getItemResult.value
          ? JSON.parse(getItemResult.value)
          : undefined;
      } catch (exception) {
        return rejectWithValue({
          reason: 'JSON_PARSE_THREW',
          error: miniSerializeError(exception),
        });
      }
    }

    call.on(TwilioCall.Event.ConnectFailure, (error) =>
      console.error('ConnectFailure:', error),
    );
    call.on(TwilioCall.Event.Reconnecting, (error) =>
      console.error('Reconnecting:', error),
    );
    call.on(TwilioCall.Event.Disconnected, (error) => {
      // The type of error here is "TwilioError | undefined".
      if (error) {
        console.error('Disconnected:', error);
      }

      const callSid = call.getSid();
      if (typeof callSid !== 'string') {
        return;
      }
      AsyncStorage.removeItem(callSid);
    });

    Object.values(TwilioCall.Event).forEach((callEvent) => {
      call.on(callEvent, () => {
        dispatch(setActiveCallInfo({ id: requestId, info: getCallInfo(call) }));
      });
    });

    call.once(TwilioCall.Event.Connected, () => {
      const info = getCallInfo(call);
      if (typeof info.initialConnectedTimestamp === 'undefined') {
        info.initialConnectedTimestamp = Date.now();
      }
      dispatch(setActiveCallInfo({ id: requestId, info }));
    });

    return { callInfo, customParameters };
  },
);

/**
 * Disconnect active call action.
 */
export const disconnectActionType = generateThunkActionTypes(
  `${sliceName}/disconnect`
);
export type DisconnectRejectValue =
  | {
      reason: 'CALL_ID_NOT_FOUND';
    }
  | {
      reason: 'NATIVE_MODULE_REJECTED';
      error: SerializedError;
    };
export const disconnectActiveCall = createTypedAsyncThunk<
  void,
  { id: string },
  { rejectValue: DisconnectRejectValue }
>(disconnectActionType.prefix, async ({ id }, { rejectWithValue }) => {
  const call = callMap.get(id);
  if (typeof call === 'undefined') {
    return rejectWithValue({ reason: 'CALL_ID_NOT_FOUND' });
  }

  const disconnectResult = await settlePromise(call.disconnect());
  if (disconnectResult.status === 'rejected') {
    return rejectWithValue({
      reason: 'NATIVE_MODULE_REJECTED',
      error: miniSerializeError(disconnectResult.reason),
    });
  }
});

/**
 * Mute active call action.
 */
export const muteActionType = generateThunkActionTypes(`${sliceName}/mute`);
export type MuteRejectValue =
  | {
      reason: 'CALL_ID_NOT_FOUND';
    }
  | {
      reason: 'NATIVE_MODULE_REJECTED';
      error: SerializedError;
    };
export const muteActiveCall = createTypedAsyncThunk<
  void,
  { id: string; shouldMute: boolean },
  { rejectValue: MuteRejectValue }
>(
  muteActionType.prefix,
  async ({ id, shouldMute }, { dispatch, rejectWithValue }) => {
    const call = callMap.get(id);
    if (typeof call === 'undefined') {
      return rejectWithValue({ reason: 'CALL_ID_NOT_FOUND' });
    }

    const muteResult = await settlePromise(call.mute(shouldMute));
    if (muteResult.status === 'rejected') {
      return rejectWithValue({
        reason: 'NATIVE_MODULE_REJECTED',
        error: miniSerializeError(muteResult.reason),
      });
    }

    dispatch(setActiveCallInfo({ id, info: getCallInfo(call) }));
  },
);

/**
 * Hold active call action.
 */
export const holdActionType = generateThunkActionTypes(`${sliceName}/hold`);
export type HoldRejectValue =
  | {
      reason: 'CALL_ID_NOT_FOUND';
    }
  | {
      reason: 'NATIVE_MODULE_REJECTED';
      error: SerializedError;
    };
export const holdActiveCall = createTypedAsyncThunk<
  void,
  { id: string; shouldHold: boolean },
  { rejectValue: MuteRejectValue }
>(
  holdActionType.prefix,
  async ({ id, shouldHold }, { dispatch, rejectWithValue }) => {
    const call = callMap.get(id);
    if (typeof call === 'undefined') {
      return rejectWithValue({ reason: 'CALL_ID_NOT_FOUND' });
    }

    const holdResult = await settlePromise(call.hold(shouldHold));
    if (holdResult.status === 'rejected') {
      return rejectWithValue({
        reason: 'NATIVE_MODULE_REJECTED',
        error: miniSerializeError(holdResult.reason),
      });
    }

    dispatch(setActiveCallInfo({ id, info: getCallInfo(call) }));
  },
);

/**
 * Action to send DTMF tones over active call.
 */
export const sendDigitsActionType = generateThunkActionTypes(
  `${sliceName}/sendDigits`,
);
export type SendDigitsRejectValue =
  | {
      reason: 'CALL_ID_NOT_FOUND';
    }
  | {
      reason: 'NATIVE_MODULE_REJECTED';
      error: SerializedError;
    };
export const sendDigitsActiveCall = createTypedAsyncThunk<
  void,
  { id: string; digits: string },
  { rejectValue: SendDigitsRejectValue }
>(sendDigitsActionType.prefix, async ({ id, digits }, { rejectWithValue }) => {
  const call = callMap.get(id);
  if (typeof call === 'undefined') {
    return rejectWithValue({ reason: 'CALL_ID_NOT_FOUND' });
  }

  const sendDigitsResult = await settlePromise(call.sendDigits(digits));
  if (sendDigitsResult.status === 'rejected') {
    return rejectWithValue({
      reason: 'NATIVE_MODULE_REJECTED',
      error: miniSerializeError(sendDigitsResult.reason),
    });
  }
});

/**
 * Slice configuration.
 */
export type ActiveCall = IncomingCall | OutgoingCall;
export const activeCallAdapter = createEntityAdapter<ActiveCall>();
export const activeCallSlice = createSlice({
  name: 'activeCall',
  initialState: activeCallAdapter.getInitialState(),
  reducers: {
    /**
     * Updates the info of a call.
     */
    setActiveCallInfo(
      state,
      action: PayloadAction<{ id: string; info: CallInfo }>,
    ) {
      match(state.entities[action.payload.id])
        .with({ status: 'fulfilled' }, (call) => {
          const originalTimestamp = call.info.initialConnectedTimestamp;
          call.info = action.payload.info;
          if (typeof call.info.initialConnectedTimestamp === 'undefined') {
            call.info.initialConnectedTimestamp = originalTimestamp;
          }
        })
        .otherwise(() => {});
    },
  },
  extraReducers(builder) {
    /**
     * Handle the "handleCall" actions.
     */
    builder.addCase(handleCall.fulfilled, (state, action) => {
      const { requestId } = action.meta;
      const { callInfo, customParameters } = action.payload;

      match([state.entities[requestId], customParameters])
        .with([undefined, undefined], () => {
          activeCallAdapter.setOne(state, {
            direction: 'incoming',
            id: requestId,
            status: 'fulfilled',
            action: {
              disconnect: { status: 'idle' },
              hold: { status: 'idle' },
              mute: { status: 'idle' },
              sendDigits: { status: 'idle' },
            },
            info: callInfo,
          });
        })
        .with([undefined, P.not(undefined)], ([_, _customParameters]) => {
          activeCallAdapter.setOne(state, {
            direction: 'outgoing',
            id: requestId,
            status: 'fulfilled',
            action: {
              disconnect: { status: 'idle' },
              hold: { status: 'idle' },
              mute: { status: 'idle' },
              sendDigits: { status: 'idle' },
            },
            params: {
              recipientType: _customParameters.recipientType,
              to: _customParameters.to,
            },
            info: action.payload.callInfo,
          });
        })
        .otherwise(() => {});
    });

    /**
     * Handle the "makeOutgoingCall" actions.
     */
    builder.addCase(makeOutgoingCall.pending, (state, action) => {
      const { arg, requestId, requestStatus } = action.meta;

      match(state.entities[requestId])
        .with(undefined, () => {
          activeCallAdapter.setOne(state, {
            direction: 'outgoing',
            id: requestId,
            params: {
              recipientType: arg.recipientType,
              to: arg.to,
            },
            status: requestStatus,
          });
        })
        .otherwise(() => {});
    });

    builder.addCase(makeOutgoingCall.fulfilled, (state, action) => {
      const { requestId, requestStatus } = action.meta;

      match(state.entities[requestId])
        .with(
          { direction: 'outgoing', status: 'pending' },
          ({ direction, params: { recipientType, to } }) => {
            activeCallAdapter.setOne(state, {
              action: {
                disconnect: { status: 'idle' },
                hold: { status: 'idle' },
                mute: { status: 'idle' },
                sendDigits: { status: 'idle' },
              },
              direction,
              id: requestId,
              info: action.payload,
              params: {
                recipientType,
                to,
              },
              status: requestStatus,
            });
          },
        )
        .otherwise(() => {});
    });

    builder.addCase(makeOutgoingCall.rejected, (state, action) => {
      const { requestId, requestStatus } = action.meta;

      match(state.entities[requestId])
        .with(
          { direction: 'outgoing', status: 'pending' },
          ({ direction, params: { recipientType, to } }) => {
            activeCallAdapter.setOne(state, {
              direction,
              id: requestId,
              params: {
                recipientType,
                to,
              },
              status: requestStatus,
            });
          },
        )
        .otherwise(() => {});
    });

    /**
     * Handle accepting a call invite.
     *
     * Note that the ID we use here is provided by argument, not the request ID.
     * This enforces the active call to have the same ID as the call invite.
     * Since both active calls and call invites are in different state slices,
     * duplicate IDs do not matter and can help map call invites to active
     * calls.
     */
    builder.addCase(acceptCallInvite.pending, (state, action) => {
      const { arg, requestStatus } = action.meta;

      match(state.entities[arg.id])
        .with(undefined, () => {
          activeCallAdapter.setOne(state, {
            direction: 'incoming',
            id: arg.id,
            status: requestStatus,
          });
        })
        .otherwise(() => {});
    });

    builder.addCase(acceptCallInvite.fulfilled, (state, action) => {
      const { arg, requestStatus } = action.meta;

      match(state.entities[arg.id])
        .with({ direction: 'incoming', status: 'pending' }, ({ direction }) => {
          activeCallAdapter.setOne(state, {
            action: {
              disconnect: { status: 'idle' },
              hold: { status: 'idle' },
              mute: { status: 'idle' },
              sendDigits: { status: 'idle' },
            },
            direction,
            id: arg.id,
            info: action.payload,
            status: requestStatus,
          });
        })
        .otherwise(() => {});
    });

    builder.addCase(acceptCallInvite.rejected, (state, action) => {
      const { arg, requestStatus } = action.meta;

      match(state.entities[arg.id])
        .with({ direction: 'incoming', status: 'pending' }, ({ direction }) => {
          activeCallAdapter.setOne(state, {
            direction,
            id: arg.id,
            status: requestStatus,
          });
        })
        .otherwise(() => {});
    });

    /**
     * Handle call interactivity actions.
     */
    (
      [
        [disconnectActiveCall, 'disconnect'],
        [holdActiveCall, 'hold'],
        [muteActiveCall, 'mute'],
        [sendDigitsActiveCall, 'sendDigits'],
      ] as const
    ).forEach(([thunk, sliceKey]) => {
      builder.addCase(thunk.pending, (state, action) => {
        match(state.entities[action.meta.arg.id])
          .with({ action: { [sliceKey]: { status: 'idle' } } }, (call) => {
            call.action[sliceKey] = { status: 'pending' };
          })
          .otherwise(() => {});
      });

      builder.addCase(thunk.fulfilled, (state, action) => {
        match(state.entities[action.meta.arg.id])
          .with({ action: { [sliceKey]: { status: 'pending' } } }, (call) => {
            call.action[sliceKey].status = 'fulfilled';
          })
          .otherwise(() => {});
      });

      builder.addCase(thunk.rejected, (state, action) => {
        match(state.entities[action.meta.arg.id])
          .with({ action: { [sliceKey]: { status: 'pending' } } }, (call) => {
            call.action[sliceKey].status = 'rejected';
          })
          .otherwise(() => {});
      });
    });
  },
});

export const { setActiveCallInfo } = activeCallSlice.actions;