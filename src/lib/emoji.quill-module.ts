import unicodeRe from 'emoji-regex';
import Quill from 'quill';

import { CompressedEmojiData, Emoji, ICustomEmoji, IEmojiReplacement } from './emoji.model';

const Module: any = Quill.import('core/module');

export type EmojiSet = 'apple' | 'google' | 'twitter' | 'emojione' | 'messenger' | 'facebook' | '';

export class EmojiModuleOptions {
  emojiData: CompressedEmojiData[];
  customEmojiData?: ICustomEmoji[];
  showTitle = true;
  preventDrag = true;
  indicator = ':';
  convertEmoticons = true;
  convertShortNames = true;
  set?: () => EmojiSet = () => 'apple';
  backgroundImageFn: (set: string, sheetSize: number) => string = (set, sheetSize) => {
    return `https://unpkg.com/emoji-datasource-${set}@4.0.4/img/${set}/sheets-256/${sheetSize}.png`;
  }
}

export class EmojiModule extends Module {

  static options: EmojiModuleOptions = null;

  private isEdgeBrowser = false;
  private pasted = false;

  get replacements(): IEmojiReplacement {

    const replacements = [
      // Unicode to Emoji
      {
        regex: unicodeRe(),
        matchIndex: 0,
        replacementIndex: 0,
        fn: (str: string) => Emoji.unicodeToEmoji(str)
      }
    ];

    if (this.options.convertEmoticons) {
      // Emoticons to Emoji
      replacements.push({
        regex: new RegExp(Emoji.emoticonRe, 'g'),
        matchIndex: 1,
        replacementIndex: 1,
        fn: (str: string) => Emoji.emoticonToEmoji(str)
      });
    }

    if (this.options.convertShortNames) {
      // ShortNames to Emoji
      replacements.push({
        regex: new RegExp(Emoji.shortNameRe, 'g'),
        matchIndex: 1,
        replacementIndex: 0,
        fn: (str: string) => Emoji.shortNameToEmoji(str)
      });
    }

    return replacements;
  }

  get options(): EmojiModuleOptions {
    return EmojiModule.options;
  }

  set options(options: EmojiModuleOptions) {
    EmojiModule.options = { ...(new EmojiModuleOptions()), ...options };
  }

  // tslint:disable-next-line: no-shadowed-variable
  constructor(public quill: any, options: EmojiModuleOptions) {
    super(quill, options);

    this.options = options;

    if (navigator.userAgent.indexOf('Edge') > -1) {
      this.isEdgeBrowser = true;
    }

    Emoji.uncompress(options.emojiData, options);

    if (options.preventDrag) {
      // Prevent emojis from dragging
      quill.container.addEventListener('dragstart', (event: DragEvent) => {
        event.preventDefault();
        return false;
      });
    }

    // Convert pasted unicode / emoticons / shortNames
    this.quill.clipboard.addMatcher(Node.TEXT_NODE, (node: HTMLElement, delta: any) => {

      return Emoji.convertPaste(delta, this.replacements);
    });

    // Listen for text change to convert typed in emojis or pasted emojis using Windows 10 Emojis / mobile
    quill.on('text-change', (delta: any, oldDelta: any, source: string) => {

      // text-change also triggers on a paste event, this is a hack to prevent one more check
      if (!this.pasted && source === Quill.sources.USER) {

        const changes = Emoji.convertInput(quill.getContents(), this.replacements);

        if (changes.ops.length > 0) {
          quill.updateContents(changes, Quill.sources.SILENT);
        }
      }

      this.pasted = false;
    });

    // Changing cut to copy and delete
    // There seems to be a bug with Quill + Chrome with cut. The performance is much worse
    if (navigator.userAgent.indexOf('Chrome') > -1) {
      quill.container.addEventListener('cut', (event: ClipboardEvent) => {
        const selection = document.getSelection();
        document.execCommand('copy');
        selection.deleteFromDocument();
        event.preventDefault();
      });
    }

    // Edge Bug #1: Image alt tags are not copied.
    // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/13921866/
    // Edge Bug #2: the url() functions in inline styles are getting escaped when pasted
    quill.container.addEventListener('paste', (event: ClipboardEvent) => {
      this.pasted = true;

      if (this.isEdgeBrowser) {
        event.clipboardData.setData('text/html', event.clipboardData.getData('text/html').replace(/&amp;quot;/g, '"'));
      }
    });
  }
}
