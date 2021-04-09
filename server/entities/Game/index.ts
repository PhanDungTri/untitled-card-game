import { EventsFromServer, SERVER_EVENT_NAME } from "../../../shared/@types";
import generateUniqueId from "../../../shared/utils/generateUniqueId";
import waitFor from "../../utilities/waitFor";
import Card from "../Card";
import Client from "../Client";
import Player from "../Player";
import Deck from "./Deck";
import GameReadyChecker from "./GameReadyChecker";
import Turn from "./Turn";

const NUM_OF_STARTING_CARDS = 5;
const DEFAULT_MAX_HP = 100;
const DEFAULT_TIME_PER_TURN = 15000;

class Game {
  public readonly id = generateUniqueId();
  private players: Player[];
  private currentPlayerIndex: number;
  private chargePoint = 0;
  private drawDeck = new Deck();
  private discardDeck: Deck = new Deck(true);

  constructor(
    clients: Client[],
    public readonly maxHP = DEFAULT_MAX_HP,
    public readonly timePerTurn = DEFAULT_TIME_PER_TURN
  ) {
    this.players = clients.map((cl) => new Player(cl, this));
    this.currentPlayerIndex = this.players.length - 1;
    new GameReadyChecker(clients, this);
    this.broadcast(SERVER_EVENT_NAME.NewGame);
  }

  public getCurrentPlayer(): Player {
    return this.players[this.currentPlayerIndex];
  }

  public getChargePoint(): number {
    return this.chargePoint;
  }

  private dealCards() {
    const startingHands: Card[][] = [];

    for (let i = 0; i < NUM_OF_STARTING_CARDS; i++) {
      for (let j = 0; j < this.players.length; j++) {
        if (!startingHands[j]) startingHands[j] = [];
        startingHands[j].push(this.drawCard());
      }
    }

    return startingHands;
  }

  public drawCard(): Card {
    if (this.drawDeck.getSize() === 0) {
      this.drawDeck.copy(this.discardDeck);
      this.discardDeck.clear();
      this.drawDeck.shuffle();
    }

    return this.drawDeck.pop() as Card;
  }

  public discardCard(card: Card): void {
    this.discardDeck.push(card);
  }

  public start(): void {
    const startingHands = this.dealCards();
    const playerList = this.players.map((p) => ({
      id: p.getClient().id,
      name: p.getClient().name,
      isEliminated: p.isEliminated,
    }));

    this.players.forEach((p, i) => {
      const client = p.getClient();

      client.emit(SERVER_EVENT_NAME.GetGameSettings, this.maxHP, this.timePerTurn);
      client.emit(SERVER_EVENT_NAME.GetPlayerList, playerList);
      p.takeCards(...startingHands[i]);
    });

    new Turn(this.nextPlayer(), this.players, this);
  }

  public shouldEnd(): boolean {
    return this.players.reduce((count, p) => (p.isEliminated ? count : count + 1), 0) < 1;
  }

  public nextPlayer(): Player {
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    } while (this.getCurrentPlayer().isEliminated);

    return this.getCurrentPlayer();
  }

  public async changeChargePoint(point: number): Promise<void> {
    this.chargePoint = point;
    this.broadcast(SERVER_EVENT_NAME.ChargePointChanged, this.chargePoint);
    await waitFor(600);
  }

  public eliminatePlayer(player: Player): void {
    player.isEliminated = true;
    this.broadcast(SERVER_EVENT_NAME.PlayerEliminated, player.getClient().id);
  }

  public broadcast(event: SERVER_EVENT_NAME, ...data: Parameters<EventsFromServer[SERVER_EVENT_NAME]>): void {
    this.players.forEach((p) => p.getClient().emit(event, ...data));
  }
}

export default Game;