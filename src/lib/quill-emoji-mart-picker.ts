import Quill from 'quill';

import { EmojiBlot } from './emoji.quill-blot';
import { EmojiModule } from './emoji.quill-module';

// Sadly the p tags are getting copied in Firefox and creating random line breaks when pasted - so using divs instead
if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
  const Block = Quill.import('blots/block');
  Block.tagName = 'div';
  Quill.register(Block);
}

Quill.register({
  'modules/emoji-module': EmojiModule,
  'formats/emoji': EmojiBlot
}, true);

export { EmojiBlot } from './emoji.quill-blot';
export { EmojiModule } from './emoji.quill-module';
export { Emoji } from './emoji.model';
export { emojis } from './emoji.data';
