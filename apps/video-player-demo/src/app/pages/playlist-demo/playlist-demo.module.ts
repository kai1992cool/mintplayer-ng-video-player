import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectModule } from '@mintplayer/ng-bootstrap/select';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';
import { youtubePlugin } from '@mintplayer/youtube-player';
import { vimeoPlugin } from '@mintplayer/vimeo-player';
import { soundCloudPlugin } from '@mintplayer/soundcloud-player';
import { mixCloudPlugin } from '@mintplayer/mixcloud-player';
import { twitchPlugin } from '@mintplayer/twitch-player';
import { spotifyPlugin } from '@mintplayer/spotify-player';
import { streamablePlugin } from '@mintplayer/streamable-player';
import { facebookPlugin } from '@mintplayer/facebook-player';
import { filePlugin } from '@mintplayer/file-player';
import { vidyardPlugin } from '@mintplayer/vidyard-player';
import { wistiaPlugin } from '@mintplayer/wistia-player';

import { VideoPlayerComponent, provideVideoApis } from '@mintplayer/ng-video-player';

import { PlaylistDemoRoutingModule } from './playlist-demo-routing.module';
import { PlaylistDemoComponent } from './playlist-demo.component';


@NgModule({
  declarations: [
    PlaylistDemoComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsGridModule,
    BsSelectModule,
    BsListGroupModule,
    BsButtonTypeDirective,
    BsToggleButtonModule,

    VideoPlayerComponent,

    PlaylistDemoRoutingModule
  ],
  providers: [
    provideVideoApis(
      youtubePlugin,
      vimeoPlugin,
      soundCloudPlugin,
      mixCloudPlugin,
      twitchPlugin,
      spotifyPlugin,
      streamablePlugin,
      facebookPlugin,
      filePlugin,
      vidyardPlugin,
      wistiaPlugin
    )
  ]
})
export class PlaylistDemoModule { }
