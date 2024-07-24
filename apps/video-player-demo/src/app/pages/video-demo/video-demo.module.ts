import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsRangeModule } from '@mintplayer/ng-bootstrap/range';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

import { VideoPlayerComponent, provideVideoApis } from '@mintplayer/ng-video-player';
import { youtubePlugin } from '@mintplayer/youtube-player';
import { dailymotionPlugin } from '@mintplayer/dailymotion-player';
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

import { VideoDemoRoutingModule } from './video-demo-routing.module';
import { VideoDemoComponent } from './video-demo.component';

@NgModule({
  declarations: [
    VideoDemoComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsFormModule,
    BsGridModule,
    BsRangeModule,
    BsListGroupModule,
    BsInputGroupComponent,
    BsButtonTypeDirective,
    BsButtonGroupComponent,
    BsToggleButtonModule,
    BsAlertModule,
   
    VideoPlayerComponent,
    
    VideoDemoRoutingModule
  ],
  providers: [
    provideVideoApis(
      youtubePlugin,
      dailymotionPlugin,
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
export class VideoDemoModule { }
