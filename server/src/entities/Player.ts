import ANIMATION_DURATION from "../../../shared/src/AnimationDuration";
import { IPlayer } from "../../../shared/src/interfaces/Player";
import SOCKET_EVENT from "../../../shared/src/SocketEvent";
import Card from "./Card";
import Client from "./Client";
import Game from "./Game";
import Spectator from "./Spectator";
import Debuff from "./spells/Debuff";
import Spell from "./spells/Spell";

class Player extends Spectator {
  private cards: Card[] = [];
  private debuffs: Debuff[] = [];
  private hitPoint: number;

  constructor(client: Client, game: Game) {
    super(client, game);
    this.hitPoint = game.getMaxHP();
    client.on(SOCKET_EVENT.PlayCard, this.playCard.bind(this));
  }

  public getCards(): Card[] {
    return this.cards;
  }

  public getCardById(id: string): Card | undefined {
    return this.cards.find((c) => c.id === id);
  }

  public countDebuffs(): number {
    return this.debuffs.length;
  }

  private playCard(id: string): void {
    const card = this.getCardById(id);

    if (card) {
      if (this.game.getCurrentPlayer() === this) {
        this.game.consumeCard(card);
      } else {
        this.getClient().send(SOCKET_EVENT.Error, "Not your turn");
      }
    }

    // TODO validate card and check if player is in any game.
  }

  public takeCards(...cards: Card[]): void {
    this.cards.push(...cards);
    this.getClient().send(SOCKET_EVENT.TakeCard, cards);
  }

  public changeHitPoint(difference: number): void {
    this.hitPoint += difference;

    if (this.hitPoint < 0) this.hitPoint = 0;
    else if (this.hitPoint > 100) this.hitPoint = 100;

    this.game.eventEmitter.dispatchChangeHitPoint(this.toJsonData());
  }

  public takeSpell(spell: Spell): void {
    if (spell instanceof Debuff) {
      this.debuffs.push(spell);
    } else {
      spell.trigger();
    }

    this.game.eventEmitter.dispatchTakeSpell(spell.toJsonData());
  }

  public removeDebuff(debuff: Debuff): void {
    this.debuffs = this.debuffs.filter((spell) => spell !== debuff);
  }

  // Return total waiting time
  public triggerDebuffs(): number {
    return this.debuffs.reduce((acc, spell, i) => {
      const wait = i * (ANIMATION_DURATION.TakeSpell + 200);

      setTimeout(() => {
        spell.trigger();
        this.game.eventEmitter.dispatchTakeSpell(spell.toJsonData());
      }, wait);

      return acc + wait;
    }, 0);
  }

  public purify(): void {
    this.debuffs = [];
    this.game.sendToAll(SOCKET_EVENT.Purify, this.client.id);
  }

  public toJsonData(): IPlayer {
    return {
      ...this.client.toJsonData(),
      hp: this.hitPoint,
    };
  }
}

export default Player;
