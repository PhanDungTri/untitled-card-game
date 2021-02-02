import { none, useState as useHookState } from "@hookstate/core";
import React, { useEffect, useState } from "react";
import { IGame } from "../../../../shared/src/interfaces/Game";
import { IPlayer } from "../../../../shared/src/interfaces/Player";
import { ISpell } from "../../../../shared/src/interfaces/Spell";
import SOCKET_EVENT from "../../../../shared/src/SocketEvent";
import SPELL_NAME from "../../../../shared/src/SpellName";
import Notification from "../../components/Notification";
import socket from "../../services/socket";
import useAppState, { APP_STATE } from "../../state/appState";
import "./Game.scss";
import GameBoard from "./GameBoard";
import GameOverDialog from "./GameOverDialog";
import OpponentList from "./OpponentList";
import PlayerHand from "./PlayerHand";
import PlayerStatus from "./PlayerStatus";

interface GameState {
  maxHP: number;
}

interface PlayerState extends IPlayer {
  spells: {
    [id: string]: ISpell;
  };
  currentSpell: SPELL_NAME;
  isEliminated: boolean;
}

interface PlayerList {
  [id: string]: PlayerState;
}

// const dummyPlayerState: PlayerState = {
//   id: "",
//   name: "",
//   hp: 0,
//   spells: {},
//   currentSpell: SPELL_NAME.Void,
//   isEliminated: false,
// };

type Winner = Pick<PlayerState, "id" | "name">;

const Game = (): JSX.Element => {
  const appState = useAppState();
  const [chosenCard, setChosenCard] = useState("");
  const playerList = useHookState<PlayerList>({});
  const [currentPlayer, setCurrentPlayer] = useState("");
  const [state, setState] = useState<GameState>({ maxHP: 0 });
  const [winner, setWinner] = useState<Winner | null>(null);

  const onGameOver = (): void => {
    socket.emit(SOCKET_EVENT.LeaveGame);
    appState.set(APP_STATE.Hub);
  };

  useEffect(() => {
    socket.emit(SOCKET_EVENT.Ready);
    socket.on(SOCKET_EVENT.StartTurn, (id: string) => setCurrentPlayer(id));

    socket.on(SOCKET_EVENT.GetGameInfo, (payload: IGame) => {
      setState({ maxHP: payload.maxHP });
      playerList.set(
        payload.players.reduce<PlayerList>((acc, cur) => {
          acc[cur.id] = {
            ...cur,
            spells: {},
            currentSpell: SPELL_NAME.Void,
            isEliminated: false,
          };

          return acc;
        }, {})
      );
    });

    socket.on(SOCKET_EVENT.PlayerEliminated, (id: string) => {
      playerList[id].isEliminated.set(true);
    });

    socket.on(SOCKET_EVENT.HitPointChanged, (payload: Omit<IPlayer, "name">[]) => {
      playerList.batch((list) => payload.forEach((p) => list[p.id].hp.set(p.hp)));
    });

    socket.on(SOCKET_EVENT.Purify, (id: string) => {
      playerList[id].spells.set({});
    });

    socket.on(SOCKET_EVENT.GameOver, (id: string) => {
      setWinner(playerList[id].value);
    });

    socket.on(SOCKET_EVENT.TakeSpell, (payload: ISpell[]) => {
      playerList.batch((list) =>
        payload.forEach((s) => {
          const spell = list[s.target].spells[s.id];

          if (s.duration === 0 && spell.value) spell.set(none);
          else if (s.duration > 0) spell.set(s);

          list[s.target].currentSpell.set(s.name);
        })
      );

      setTimeout(
        () =>
          playerList.batch((list) =>
            Object.values(list.value).forEach((p) => {
              if (p.currentSpell !== SPELL_NAME.Void) list[p.id].currentSpell.set(SPELL_NAME.Void);
            })
          ),
        450
      );
    });

    return (): void => {
      socket.off(SOCKET_EVENT.StartTurn);
      socket.off(SOCKET_EVENT.GetGameInfo);
      socket.off(SOCKET_EVENT.HitPointChanged);
      socket.off(SOCKET_EVENT.Purify);
      socket.off(SOCKET_EVENT.TakeSpell);
      socket.off(SOCKET_EVENT.PlayerEliminated);
    };
  }, []);

  return (
    <div className="game" onClick={() => setChosenCard("")}>
      <OpponentList maxHP={state.maxHP} opponents={Object.values(playerList.value).filter((p) => p.id !== socket.id)} />
      <GameBoard />
      <div className="player">
        <PlayerStatus maxHP={state.maxHP} hp={playerList[socket.id].value?.hp || 0} />
        <PlayerHand
          currentPlayer={currentPlayer}
          chooseCard={(id: string) => setChosenCard(id)}
          chosenCard={chosenCard}
          eliminated={!!playerList[socket.id].value?.isEliminated}
        />
      </div>
      <GameOverDialog open={!!winner} onClose={onGameOver} winner={winner as Winner} />
      <Notification />
    </div>
  );
};

export default Game;
export type { PlayerList, PlayerState, Winner };
