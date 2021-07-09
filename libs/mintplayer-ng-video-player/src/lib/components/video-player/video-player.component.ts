/// <reference path="../../../../../../node_modules/@types/youtube/index.d.ts" />
/// <reference path="../../interfaces/dailymotion.ts" />
/// <reference path="../../interfaces/vimeo.ts" />

import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, Subject } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';
import { YoutubeApiService } from '@mintplayer/ng-youtube-api';
import { DailymotionApiService } from '@mintplayer/ng-dailymotion-api';
import { VimeoApiService } from '@mintplayer/ng-vimeo-api';
import { PlayerProgress } from '@mintplayer/ng-player-progress';
import { PlayerType } from '../../enums';
import { VideoRequest } from '../../interfaces/video-request';
import { PlatformWithRegexes } from '../../interfaces/platform-with-regexes';

@Component({
  selector: 'video-player',
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.scss']
})
export class VideoPlayerComponent implements OnInit, AfterViewInit, OnDestroy {
  constructor(
    private youtubeApiService: YoutubeApiService,
    private dailymotionApiService: DailymotionApiService,
    private vimeoApiService: VimeoApiService,
    private zone: NgZone,
  ) {
    combineLatest([this.isViewInited$, this.videoRequest$])
      .pipe(filter(([isViewInited, videoRequest]) => {
        return !!isViewInited && (videoRequest !== null);
      }))
      .pipe(takeUntil(this.destroyed$))
      .subscribe(([isViewInited, videoRequest]) => {
        console.log('Video request', videoRequest);
        switch (videoRequest?.playerType) {
          case PlayerType.youtube:
            this.youtubeApiService.youtubeApiReady$
              .pipe(filter(ready => !!ready), take(1), takeUntil(this.destroyed$))
              .subscribe((ready) => {
                this.isApiReady$.next(ready);
              });
            this.youtubeApiService.loadApi();
            break;
          case PlayerType.dailymotion:
            this.dailymotionApiService.dailymotionApiReady$
              .pipe(filter(ready => !!ready), take(1), takeUntil(this.destroyed$))
              .subscribe((ready) => {
                this.isApiReady$.next(ready);
              });
            this.dailymotionApiService.loadApi();
            break;
          case PlayerType.vimeo:
            this.vimeoApiService.vimeoApiReady$
              .pipe(filter(ready => !!ready), take(1), takeUntil(this.destroyed$))
              .subscribe((ready) => {
                this.isApiReady$.next(ready);
              });
            this.vimeoApiService.loadApi();
            break;
        }
      });

    let setHtml = () => {
      this.domId = `player${VideoPlayerComponent.playerCounter++}`;
      this.container.nativeElement.innerHTML = `<div id="${this.domId}"></div>`;
    };

    this.isApiReady$
      .pipe(filter(r => !!r), takeUntil(this.destroyed$))
      .subscribe((value) => {
        let videoRequest = this.videoRequest$.value;
        switch (videoRequest?.playerType) {
          case PlayerType.youtube:
            if (this.playerInfo?.type === PlayerType.youtube) {
              (<YT.Player>this.playerInfo.player).loadVideoById(videoRequest.id);
            } else {
              setHtml();
              this.playerInfo = {
                type: PlayerType.youtube,
                player: new YT.Player(this.domId, {
                  width: this.width,
                  height: this.height,
                  playerVars: {
                    autoplay: <any>this.autoplay,
                  },
                  events: {
                    onReady: (ev: YT.PlayerEvent) => {
                      this.isPlayerReady$.next(true);
                    }
                  }
                })
              };
            }
            break;
          case PlayerType.dailymotion:
            if (this.playerInfo?.type === PlayerType.dailymotion) {
              (<DM.Player>this.playerInfo.player).load({ video: videoRequest.id });
            } else {
              setHtml();
              this.playerInfo = {
                type: PlayerType.dailymotion,
                player: DM.player(this.container.nativeElement.getElementsByTagName('div')[0], {
                  width: String(this.width),
                  height: String(this.height),
                  params: {
                    autoplay: this.autoplay,
                  },
                  events: {
                    apiready: () => {
                      this.isPlayerReady$.next(true);
                    }
                  }
                })
              };
            }
            break;
          case PlayerType.vimeo:
            if (this.playerInfo?.type === PlayerType.vimeo) {
              (<Vimeo.Player>this.playerInfo.player).loadVideo(videoRequest.id);
            } else {
              setHtml();
              let videoId = videoRequest.id;
              let vimeoPlayer = new Vimeo.Player(this.domId, {
                id: videoId,
                width: this.width,
                height: this.height,
                autoplay: this.autoplay,
              });
              this.playerInfo = {
                type: PlayerType.vimeo,
                player: vimeoPlayer
              };
              vimeoPlayer.ready().then(() => {
                this.isPlayerReady$.next(true);
              });
              break;
            }
        }
      });

    this.isPlayerReady$
      .pipe(filter(r => !!r), takeUntil(this.destroyed$))
      .subscribe((ready) => {
        (<any>window).myPlayer = this.playerInfo?.player;
        let videoRequest = this.videoRequest$.value;
        if (videoRequest !== null) {
          if (typeof videoRequest.id !== 'undefined') {
            if (videoRequest.playerType === PlayerType.youtube) {
              (<YT.Player>this.playerInfo?.player).loadVideoById(videoRequest.id)
            } else if (videoRequest.playerType === PlayerType.dailymotion) {
              (<DM.Player>this.playerInfo?.player).load({ video: videoRequest.id });
            } else if (videoRequest.playerType === PlayerType.vimeo) {
              (<Vimeo.Player>this.playerInfo?.player).loadVideo(videoRequest.id);
            }
          }
        }
      });
  }

  //#region width
  private _width: number = 600;
  get width() {
    return this._width;
  }
  @Input() set width(value: number) {
    this._width = value;
    if (!!this.playerInfo && !!this.playerInfo.player) {
      switch (this.playerInfo.type) {
        case PlayerType.youtube:
          (<YT.Player>this.playerInfo.player).setSize(this._width, this._height);
          break;
        case PlayerType.dailymotion:
          (<DM.Player>this.playerInfo.player).width = this._width;
          break;
        case PlayerType.vimeo:
          let iframe = this.container.nativeElement.querySelector<HTMLIFrameElement>('div iframe');
          if (!!iframe) {
            iframe.width = String(value);
          }
          break;
      }
    }
  }
  //#endregion
  //#region height
  private _height: number = 450;
  get height() {
    return this._height;
  }
  @Input() set height(value: number) {
    this._height = value;
    if (!!this.playerInfo && !!this.playerInfo.player) {
      switch (this.playerInfo.type) {
        case PlayerType.youtube:
          (<YT.Player>this.playerInfo.player).setSize(this._width, this._height);
          break;
        case PlayerType.dailymotion:
          (<DM.Player>this.playerInfo.player).height = this._height;
          break;
        case PlayerType.vimeo:
          let iframe = this.container.nativeElement.querySelector<HTMLIFrameElement>('div iframe');
          if (!!iframe) {
            iframe.height = String(value);
          }
          break;
      }
    }
  }
  //#endregion
  @Input() public autoplay: boolean = true;
  //#region url
  @Input() public set url(value: string) {

    const platforms: PlatformWithRegexes[] = [{
      platform: PlayerType.youtube,
      regexes: [
        // new RegExp(/http[s]{0,1}:\/\/(www\.){0,1}youtube\.com\/watch\?v=(?<id>.+)/, 'g'),
        new RegExp(/http[s]{0,1}:\/\/(www\.){0,1}youtube\.com\/watch\?v=(?<id>[^&]+)/, 'g'),
        new RegExp(/http[s]{0,1}:\/\/(www\.){0,1}youtu\.be\/(?<id>.+)$/, 'g'),
      ]
    }, {
      platform: PlayerType.dailymotion,
      regexes: [
        new RegExp(/http[s]{0,1}:\/\/(www\.){0,1}dailymotion\.com\/video\/(?<id>[0-9A-Za-z]+)$/, 'g'),
      ]
    }, {
      platform: PlayerType.vimeo,
      regexes: [
        new RegExp(/http[s]{0,1}:\/\/(www\.){0,1}vimeo\.com\/(?<id>[0-9]+)$/, 'g'),
      ]
    }];

    let platformIds = platforms.map(p => {
      let matches = p.regexes.map(r => r.exec(value)).filter(r => r !== null);
      if (matches.length === 0) {
        return null;
      }

      if (matches[0] === null) {
        return null;
      } else if (matches[0].groups == null) {
        return null;
      }

      return {
        platform: p.platform,
        id: matches[0].groups.id
      };
    }).filter(p => (p !== null));

    if (platformIds.length === 0) {
      throw `No player found for url ${value}`;
    }

    if (!!platformIds[0]) {
      this.videoRequest$.next({ playerType: platformIds[0].platform, id: platformIds[0].id });
    }
  }
  //#endregion
  @ViewChild('container') container!: ElementRef<HTMLDivElement>;

  private static playerCounter: number = 1;
  domId: string = 'player';

  private destroyed$ = new Subject();
  private isViewInited$ = new BehaviorSubject<boolean>(false);
  private videoRequest$ = new BehaviorSubject<VideoRequest | null>(null);
  private isApiReady$ = new Subject();
  private isPlayerReady$ = new BehaviorSubject<boolean>(false);

  private playerInfo: { type: PlayerType, player: YT.Player | DM.Player | Vimeo.Player } | null = null;

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.isViewInited$.next(true);
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
