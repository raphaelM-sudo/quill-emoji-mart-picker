import Quill from 'quill';

import { Emoji, IEmoji } from './emoji.model';
import { EmojiModule } from './emoji.quill-module';

const Parchment: any = Quill.import('parchment');

export class EmojiBlot extends Parchment.Embed {

  static create(value: string | IEmoji) {

    const node: HTMLElement = super.create() as HTMLElement;

    const options = EmojiModule.options;

    if (value) {
      Emoji.buildImage(value, node, options.set(), options);
    }

    return node;
  }

  static value(node: HTMLElement) {
    return node.getAttribute('alt');
  }
}

// tslint:disable: no-string-literal
EmojiBlot['blotName'] = 'emoji';
EmojiBlot['className'] = 'ql-emoji';
EmojiBlot['tagName'] = 'img';
