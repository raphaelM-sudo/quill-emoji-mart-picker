import { Component, OnInit, VERSION } from '@angular/core';
import { emojis } from '@nutrify/ngx-emoji-mart-picker/ngx-emoji/esm5/data/emojis';
import { EmojiEvent } from '@nutrify/ngx-emoji-mart-picker/ngx-emoji/public_api';

import { Emoji } from '../lib/emoji.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'quill-emoji-mart-picker';
  version = VERSION.full;
  set = 'apple';

  modules = {};
  formats: string[] = [];
  quill = null;

  customEmojis = [
    {
      name: 'Party Parrot',
      shortNames: ['parrot'],
      keywords: ['party'],
      imageUrl: './assets/images/parrot.gif',
    },
    {
      name: 'Test Flag',
      shortNames: ['test'],
      keywords: ['test', 'flag'],
      spriteUrl: 'https://unpkg.com/emoji-datasource-twitter@4.0.4/img/twitter/sheets-256/64.png',
      sheet_x: 1,
      sheet_y: 1,
      size: 64,
      sheetColumns: 52,
      sheetRows: 52,
    },
  ];

  created(quill: any) {
    this.quill = quill;
  }

  insertEmoji(event: EmojiEvent) {
    Emoji.insertEmoji(this.quill, event);
  }

  ngOnInit() {
    // tslint:disable-next-line: no-console
    console.info(
      'I am developing those modules on my own, in my free time. ' +
      'It is very time consuming to deliver quality code.\n' +
      '\nIf you appreciate my work, please buy me a coffee 😊\n' +
      '\nThanks'
    );
  }

  constructor() {

    this.modules = {
      'emoji-module': {
        emojiData: emojis,
        customEmojiData: this.customEmojis,
        preventDrag: true,
        showTitle: true,
        indicator: '*',
        convertEmoticons: true,
        convertShortNames: true,
        set: () => this.set
      },
      toolbar: false
    };

    this.formats = ['emoji'];
  }
}
