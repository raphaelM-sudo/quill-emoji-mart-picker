import unicodeRe from 'emoji-regex';
import Quill from 'quill';

import { EmojiModuleOptions, EmojiSet } from './emoji.quill-module';

const Delta = Quill.import('delta');

export type ICustomEmoji = ICustomImageEmojiView | ICustomSpriteEmojiView;
export type IEmoji = IEmojiView | ICustomEmoji;

export interface CompressedEmojiData {
  name: string;
  unified: string;
  shortName: string;
  shortNames?: string[];
  sheet: [number, number];
  keywords?: string[];
  hidden?: string[];
  emoticons?: string[];
  text?: string;
  skinVariations?: EmojiVariation[];
  obsoletedBy?: string;
  obsoletes?: string;
}

export interface IEmojiReplacer {
  regex: RegExp;
  fn: (str: string) => IEmoji;
  matchIndex: number;
  replacementIndex: number; // Workaround to support regex lookahead on all browsers
  match?: RegExpExecArray;
}

export type IEmojiReplacement = IEmojiReplacer[];


interface IEmojiView {
  unified: string;
  id: string;
  sheet: [number, number];
  emoticons?: string[];
}

interface ICustomImageEmojiView {
  id: string;
  imageUrl: string;
  shortNames?: string[];
}

interface ICustomSpriteEmojiView {
  id: string;
  spriteUrl: string;
  sheet_x: number;
  sheet_y: number;
  size: 16 | 20 | 32 | 64;
  sheetColumns: number;
  sheetRows?: number; // Not really necessary
  shortNames?: string[];
}

interface EmojiVariation {
  unified: string;
  sheet: [number, number];
  hidden?: string[];
}

export class Emoji {

  static unified: { [key: string]: IEmoji } = {};
  static emoticons: { [key: string]: IEmoji } = {};
  static shortNames: { [key: string]: IEmoji } = {};

  static emojiPrefix = 'qle-';

  // tslint:disable-next-line: max-line-length
  static emoticonRe = `(?:\\s|^)((?:8\\))|(?:\\(:)|(?:\\):)|(?::'\\()|(?::\\()|(?::\\))|(?::\\*)|(?::-\\()|(?::-\\))|(?::-\\*)|(?::-/)|(?::->)|(?::-D)|(?::-O)|(?::-P)|(?::-\\\\)|(?::-b)|(?::-o)|(?::-p)|(?::-\\|)|(?::/)|(?::>)|(?::D)|(?::O)|(?::P)|(?::\\\\)|(?::b)|(?::o)|(?::p)|(?::\\|)|(?:;\\))|(?:;-\\))|(?:;-P)|(?:;-b)|(?:;-p)|(?:;P)|(?:;b)|(?:;p)|(?:<3)|(?:</3)|(?:=\\))|(?:=-\\))|(?:>:\\()|(?:>:-\\()|(?:C:)|(?:D:)|(?:c:))(?=\\s|$)`;
  static shortNameRe = '(?:[^\\*]|^)\\*([a-z0-9_\\-\\+]+)\\*(?!\\*)';

  static toCodePoint(unicodeSurrogates: string, sep?: string) {

    const r = [];
    let c = 0;
    let p = 0;
    let i = 0;

    while (i < unicodeSurrogates.length) {
      c = unicodeSurrogates.charCodeAt(i++);
      if (p) {
        // tslint:disable-next-line:no-bitwise
        r.push((0x10000 + ((p - 0xD800) << 10) + (c - 0xDC00)).toString(16));
        p = 0;
      } else if (0xD800 <= c && c <= 0xDBFF) {
        p = c;
      } else {
        r.push(c.toString(16));
      }
    }

    return r.join(sep || '-');
  }

  static unicodeToEmoji(unicode: string): IEmoji {
    return Emoji.getEmojiDataFromUnified(Emoji.toCodePoint(unicode));
  }

  static emoticonToEmoji(emoticon: string): IEmoji {
    return Emoji.getEmojiDataFromEmoticon(emoticon);
  }

  static shortNameToEmoji(shortName: string): IEmoji {
    return Emoji.getEmojiDataFromShortName(shortName);
  }

  static getEmojiDataFromUnified(unified: string): IEmoji {

    const emoji = Emoji.unified[unified.toUpperCase()];

    return emoji ? emoji : null;
  }

  static getEmojiDataFromEmoticon(emoticon: string): IEmoji {

    const emoji = Emoji.emoticons[emoticon];

    return emoji ? emoji : null;
  }

  static getEmojiDataFromShortName(shortName: string): IEmoji {

    const emoji = Emoji.shortNames[shortName.toLowerCase()];

    return emoji ? emoji : null;
  }

  static uncompress(list: CompressedEmojiData[], options: EmojiModuleOptions) {
    list.map(emoji => {

      const emojiRef = Emoji.unified[emoji.unified] = {
        unified: emoji.unified,
        id: emoji.shortName,
        sheet: emoji.sheet,
        emoticons: emoji.emoticons
      };

      Emoji.shortNames[emoji.shortName] = emojiRef;

      // Additional shortNames
      if (emoji.shortNames) {
        for (const d of emoji.shortNames) {
          Emoji.shortNames[d] = emojiRef;
        }
      }

      if (options.convertEmoticons && emoji.emoticons) {
        for (const d of emoji.emoticons) {
          Emoji.emoticons[d] = emojiRef;
        }
      }

      if (emoji.skinVariations) {
        for (const d of emoji.skinVariations) {
          Emoji.unified[d.unified] = {
            unified: d.unified,
            id: emojiRef.id,
            sheet: d.sheet,
            emoticons: emojiRef.emoticons
          };
        }
      }
    });

    if (options.customEmojiData) {
      for (let customEmoji of options.customEmojiData) {
        if (customEmoji.shortNames) {
          customEmoji = { ...customEmoji, id: customEmoji.shortNames[0] };
          Emoji.shortNames[customEmoji.id] = customEmoji;
        }
      }
    }
  }

  static unifiedToNative(unified: string) {
    const codePoints = unified.split('-').map(u => parseInt(`0x${u}`, 16));
    return String.fromCodePoint(...codePoints);
  }

  static emojiSpriteStyles(
    sheet: IEmojiView['sheet'],
    set: EmojiSet | '',
    backgroundImageFn: (set: string, sheetSize: number) => string,
    size: number = 24,
    sheetSize: 16 | 20 | 32 | 64 = 64,
    sheetColumns = 52
    ) {

    return {
      width: `${size}px`,
      height: `${size}px`,
      display: 'inline-block',
      'background-image': `url(${backgroundImageFn(set, sheetSize)})`,
      'background-size': `${100 * sheetColumns}%`,
      'background-position': Emoji.getSpritePosition(sheet, sheetColumns),
    };
  }

  static getSpritePosition(sheet: IEmojiView['sheet'], sheetColumns: number) {
    const [sheetX, sheetY] = sheet;
    const multiply = 100 / (sheetColumns - 1);
    return `${multiply * sheetX}% ${multiply * sheetY}%`;
  }

  static toHex(str: string) {
    let hex: string;
    let result = '';

    for (let i = 0; i < str.length; i++) {
        hex = str.charCodeAt(i).toString(16);
        result += ('000' + hex).slice(-4);
    }

    return result;
  }

  static buildImage(
    emoji: string | IEmoji,
    node: HTMLElement,
    set: EmojiSet,
    options: EmojiModuleOptions
    ) {

    if (typeof emoji === 'string') {

      const unicodeRegex = unicodeRe();

      if (unicodeRegex.test(emoji)) {

        emoji = Emoji.unicodeToEmoji(emoji);

      } else {

        const shortNameRegex = new RegExp(Emoji.shortNameRe);
        const match = shortNameRegex.exec(emoji);
        if (match && match.length > 1) {
          emoji = Emoji.shortNameToEmoji(match[1]);
        }
      }
    }

    if (emoji && typeof emoji === 'object') {

      node.classList.add(Emoji.emojiPrefix + emoji.id);

      // Custom image
      if ((emoji as ICustomImageEmojiView).imageUrl) {

        node.classList.add(Emoji.emojiPrefix + 'custom');

        node.style.backgroundImage = `url("${(emoji as ICustomImageEmojiView).imageUrl}")`;
        node.style.backgroundSize = 'contain';
      } else {

        // Using a sprite
        let style = null;

        // Default emoji using a set
        if ((emoji as IEmojiView).sheet) {

          style = Emoji.emojiSpriteStyles((emoji as IEmojiView).sheet, set, options.backgroundImageFn);

        } else if ((emoji as ICustomSpriteEmojiView).spriteUrl) { // Emoji using a sprite URL

          node.classList.add(Emoji.emojiPrefix + 'custom');

          style = Emoji.emojiSpriteStyles(
            [(emoji as ICustomSpriteEmojiView).sheet_x, (emoji as ICustomSpriteEmojiView).sheet_y],
            '',
            () => (emoji as ICustomSpriteEmojiView).spriteUrl,
            24,
            (emoji as ICustomSpriteEmojiView).size,
            (emoji as ICustomSpriteEmojiView).sheetColumns
          );
        }

        if (style) {
          node.style.display = 'inline-block';
          node.style.backgroundImage = style['background-image'];
          node.style.backgroundSize = style['background-size'];
          node.style.backgroundPosition = style['background-position'];
        }

      }

      node.style.fontSize = 'inherit';

      node.setAttribute('src', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
      node.setAttribute('draggable', 'false');

      if ((emoji as IEmojiView).unified) {
        const native = Emoji.unifiedToNative((emoji as IEmojiView).unified);
        node.setAttribute('alt', native);
      } else {
        node.setAttribute('alt', options.indicator + emoji.id + options.indicator);
      }

      if (options.showTitle) {
        const emoticons = (emoji as IEmojiView).emoticons;

        let title = '';

        if (options.convertEmoticons && emoticons && emoticons.length > 0) {
          title = emoticons[0] + '\u2002,\u2002';
        }

        title += options.indicator + emoji.id + options.indicator;

        node.setAttribute('title', title);
      }

    }
    return node;
  }

  static convertInput(delta: any, replacements: IEmojiReplacement): any {

    const changes = new Delta();

    let position = 0;

    delta.ops.forEach((op: any) => {

      if (op.insert) {

        if (typeof op.insert === 'object') {
          position++;
        } else if (typeof op.insert === 'string') {

          const text = op.insert;

          let emojiText = '';
          let index: number;

          for (const replacement of replacements) {

            // tslint:disable-next-line: no-conditional-assignment
            while ((replacement.match = replacement.regex.exec(text))) {

              // Setting the index and using the difference between the matches as a workaround for a lookahead regex
              index = replacement.match.index + (replacement.match[0].length - replacement.match[replacement.replacementIndex].length);

              emojiText = replacement.match[replacement.matchIndex];

              const emoji = replacement.fn(emojiText);

              const changeIndex = position + index;

              if (changeIndex > 0) {
              changes.retain(changeIndex);
              }

              changes.delete(replacement.match[replacement.replacementIndex].length);

              if (emoji) {
                changes.insert({ emoji });
              }
            }
          }

          position += op.insert.length;
        }
      }
    });

    return changes;
  }

  static convertPaste(delta: any, replacements: IEmojiReplacement): any {

    const changes = new Delta();
    let op = null;

    // Matchers are called recursively, so iterating is not necessary
    if (delta) {
      op = delta.ops[0];
    }

    if (op && op.insert && typeof op.insert === 'string') {

      const text = op.insert;

      let emojiText = '';
      let currentReplacement: IEmojiReplacer = null;
      let index = 0;

      let i = 0;

      do {
        // Getting our first match
        let tempReplacement: IEmojiReplacer = null;
        for (const replacement of replacements) {

          // Select the first match in the replacements array
          if (replacement.match === undefined || currentReplacement === replacement) {
            replacement.match = replacement.regex.exec(text);
          }

          if (replacement.match) {

            if (!tempReplacement || !tempReplacement.match ||
                (replacement.match.index < tempReplacement.match.index)
               ) {
                tempReplacement = replacement;
            }
          }
        }

        currentReplacement = tempReplacement;

        if (currentReplacement && currentReplacement.match) {

          // Setting the index and using the difference between the matches as a workaround for a lookahead regex
          index = currentReplacement.match.index +
          (
            currentReplacement.match[0].length - currentReplacement.match[currentReplacement.replacementIndex].length
          );

          if (index !== i) {
            changes.insert(text.slice(i, index));
          }

          emojiText = currentReplacement.match[currentReplacement.matchIndex];
          const emoji = currentReplacement.fn(emojiText);

          if (emoji) {
            changes.insert({ emoji });
          }

          i = index + currentReplacement.match[currentReplacement.replacementIndex].length;
        }
      } while (currentReplacement && currentReplacement.match);

      // Check if there is text left
      if (i < text.length) {
        changes.insert(text.slice(i));
      }
    }
    return changes;
  }

  static insertEmoji(quill: any, event: any) {
    if (quill && quill.isEnabled()) {

      const range = quill.getSelection(true);

      const delta = new Delta().retain(range.index).delete(range.length).insert({ emoji: event.emoji });

      // Using silent to not trigger text-change, but checking if the editor is enabled
      quill.updateContents(delta, Quill.sources.SILENT);
      quill.setSelection(++range.index, 0, Quill.sources.SILENT);
    }
  }
}
