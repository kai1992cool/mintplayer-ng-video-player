/// <reference path="../../../../../../node_modules/@types/youtube/index.d.ts" />
/// <reference path="../../interfaces/dailymotion.ts" />
/// <reference path="../../interfaces/vimeo.ts" />
/// <reference path="../../interfaces/soundcloud.ts" />

import { AfterViewInit, Component, ElementRef, EventEmitter, Inject, Input, NgZone, OnDestroy, OnInit, Output, PLATFORM_ID, ViewChild } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BehaviorSubject, combineLatest, Subject, timer } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';
import { PlayerProgress } from '@mintplayer/ng-player-progress';
import { YoutubeApiService } from '@mintplayer/ng-youtube-api';
import { DailymotionApiService } from '@mintplayer/ng-dailymotion-api';
import { VimeoApiService } from '@mintplayer/ng-vimeo-api';
import { SoundcloudApiService } from '@mintplayer/ng-soundcloud-api';
import { PlayerState, PlayerType } from '../../enums';
import { VideoRequest } from '../../interfaces/video-request';
import { PlayProgressEvent } from '../../interfaces/soundcloud/play-progress.event';
import { PlayerTypeFinderService } from '../../services';

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
    private soundcloudApiService: SoundcloudApiService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private zone: NgZone,
    private playerTypeFinder: PlayerTypeFinderService,
  ) {
    // [isViewInited$,videoRequest$] => isApiReady$
    combineLatest([this.isViewInited$, this.videoRequest$])
      .pipe(filter(([isViewInited, videoRequest]) => {
        return !!isViewInited;
      }))
      .pipe(takeUntil(this.destroyed$))
      .subscribe(([isViewInited, videoRequest]) => {
        console.log('Received videoRequest');
        if (videoRequest === null) {
          this.destroyCurrentPlayer();
          this.playerInfo = null;
          this.container.nativeElement.innerHTML = '';
        } else {
          switch (videoRequest.playerType) {
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
            case PlayerType.soundcloud:
              this.soundcloudApiService.soundcloudApiReady$
                .pipe(filter(ready => !!ready), take(1), takeUntil(this.destroyed$))
                .subscribe((ready) => {
                  this.isApiReady$.next(ready);
                });
              this.soundcloudApiService.loadApi();
              break;
          }
        }
      });

    let setHtml = (playertype: PlayerType) => {
      this.domId = `player${VideoPlayerComponent.playerCounter++}`;
      if (playertype === PlayerType.soundcloud) {
        this.container.nativeElement.innerHTML = `<iframe id="${this.domId}" width="${this._width}" height="${this._height}" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/293&amp;show_teaser=false&amp;" allow="autoplay"></iframe>`;
      } else {
        this.container.nativeElement.innerHTML = `<div id="${this.domId}"></div>`;
      }
    };
    
    // [isApiReady$, videoRequest.playerType] => isSwitchingVideo$, isPlayerReady$
    this.isApiReady$
      .pipe(filter(r => !!r), takeUntil(this.destroyed$))
      .subscribe((value) => {
        let currentVideoRequest = this.videoRequest$.value;
        switch (currentVideoRequest?.playerType) {
          case PlayerType.youtube:
            if (this.playerInfo?.type === PlayerType.youtube) {
              // Recycle the YT.Player
              (<YT.Player>this.playerInfo.player).loadVideoById(currentVideoRequest.id);
              this.isSwitchingVideo$.next(false);
            } else {
              this.destroyCurrentPlayer();
              setHtml(PlayerType.youtube);
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
                      this.isSwitchingVideo$.next(false);
                    },
                    onStateChange: (ev: YT.OnStateChangeEvent) => {
                      this.zone.run(() => {
                        switch (ev.data) {
                          case YT.PlayerState.PLAYING:
                            this.playerStateChange.emit(PlayerState.playing);
                            break;
                          case YT.PlayerState.PAUSED:
                            this.playerStateChange.emit(PlayerState.paused);
                            break;
                          case YT.PlayerState.ENDED:
                            this.playerStateChange.emit(PlayerState.ended);
                            break;
                          case YT.PlayerState.UNSTARTED:
                            this.playerStateChange.emit(PlayerState.unstarted);
                            break;
                        }
                      });
                    }
                  }
                })
              };
            }
            break;
          case PlayerType.dailymotion:
            if (this.playerInfo?.type === PlayerType.dailymotion) {
              // Recycle the DM.Player
              (<DM.Player>this.playerInfo.player).load({ video: currentVideoRequest.id });
              this.isSwitchingVideo$.next(false);
            } else {
              this.destroyCurrentPlayer();
              setHtml(PlayerType.dailymotion);
              this.playerInfo = {
                type: PlayerType.dailymotion,
                player: DM.player(this.container.nativeElement.getElementsByTagName('div')[0], {
                  width: String(this.width),
                  height: String(this.height),
                  params: {
                    autoplay: this.autoplay,
                    "queue-enable": false,
                  },
                  events: {
                    apiready: () => {
                      this.isPlayerReady$.next(true);
                      this.isSwitchingVideo$.next(false);
                    },
                    play: () => {
                      this.zone.run(() => {
                        this.playerStateChange.emit(PlayerState.playing);
                      });
                    },
                    pause: () => {
                      this.zone.run(() => {
                        this.playerStateChange.emit(PlayerState.paused);
                      });
                    },
                    end: () => {
                      this.zone.run(() => {
                        this.playerStateChange.emit(PlayerState.ended);
                      });
                    }
                  }
                })
              };
            }
            break;
          case PlayerType.vimeo:
            if (this.playerInfo?.type === PlayerType.vimeo) {
              // Recycle the Vimeo.Player
              (<Vimeo.Player>this.playerInfo.player).loadVideo(currentVideoRequest.id).then((v) => {
                this.isSwitchingVideo$.next(false);
              });
            } else {
              this.destroyCurrentPlayer();
              setHtml(PlayerType.vimeo);
              let videoId = currentVideoRequest.id;
              let vimeoPlayer = new Vimeo.Player(this.domId, {
                id: videoId,
                width: this.width,
                height: this.height,
                autoplay: this.autoplay,
                pip: true
              });
              this.playerInfo = {
                type: PlayerType.vimeo,
                player: vimeoPlayer
              };
              vimeoPlayer.ready().then(() => {
                this.isPlayerReady$.next(true);
                this.isSwitchingVideo$.next(false);
                this.zone.run(() => {
                  this.playerStateChange.emit(PlayerState.unstarted);
                });
              });
              vimeoPlayer.on('loaded', () => {
                this.hasJustLoaded = true;
                this.zone.run(() => {
                  this.playerStateChange.emit(PlayerState.unstarted);
                });
                setTimeout(() => {
                  let player = <Vimeo.Player>this.playerInfo?.player;
                  this.hasJustLoaded = false;
                  player.getVolume().then(vol => {
                    this.zone.run(() => {
                      this.volumeChange.emit(this._volume = vol * 100);
                    });
                  });
                  if (this.autoplay) {
                    player.play();
                  }
                }, 600);
              });
              vimeoPlayer.on('play', () => {
                this.zone.run(() => {
                  this.playerStateChange.emit(PlayerState.playing);
                });
              });
              vimeoPlayer.on('pause', () => {
                if (!this.hasJustLoaded) {
                  this.zone.run(() => {
                    this.playerStateChange.emit(PlayerState.paused);
                  });
                }
              });
              vimeoPlayer.on('ended', () => {
                this.zone.run(() => {
                  this.playerStateChange.emit(PlayerState.ended);
                });
              });
              vimeoPlayer.on('volumechange', (event) => {
                this.zone.run(() => {
                  this.volumeChange.emit(this._volume = event.volume * 100);
                });
              });
              vimeoPlayer.on('timeupdate', (event) => {
                vimeoPlayer.getDuration().then((d) => {
                  this.zone.run(() => {
                    this.progressChange.emit({
                      currentTime: this._currentTime = event.seconds,
                      duration: d
                    });
                  });
                });
              });
              vimeoPlayer.on('enterpictureinpicture', (event) => {
                this.zone.run(() => {
                  this.isPipChange.emit(true);
                });
              });
              vimeoPlayer.on('leavepictureinpicture', (event) => {
                this.zone.run(() => {
                  this.isPipChange.emit(false);
                });
              });
            }
            break;
          case PlayerType.soundcloud:
            if (this.playerInfo?.type === PlayerType.soundcloud) {
              (<SC.Widget.Player>this.playerInfo.player).load(currentVideoRequest.id, {
                auto_play: true,
                callback: () => {
                  this.isSwitchingVideo$.next(false);
                }
              });
            } else {
              this.destroyCurrentPlayer();
              setHtml(PlayerType.soundcloud);
              let soundcloudPlayer = SC.Widget(<HTMLIFrameElement>document.getElementById(this.domId));
              this.playerInfo = {
                type: PlayerType.soundcloud,
                player: soundcloudPlayer
              };
              soundcloudPlayer.bind(SC.Widget.Events.READY, () => {
                this.isPlayerReady$.next(true);
                this.isSwitchingVideo$.next(false);
                this.zone.run(() => {
                  this.playerStateChange.emit(PlayerState.unstarted);
                });
              });
              soundcloudPlayer.bind(SC.Widget.Events.PLAY, () => {
                this.zone.run(() => {
                  this.playerStateChange.emit(PlayerState.playing);
                });
              });
              soundcloudPlayer.bind(SC.Widget.Events.PAUSE, () => {
                this.zone.run(() => {
                  this.playerStateChange.emit(PlayerState.paused);
                });
              });
              soundcloudPlayer.bind(SC.Widget.Events.FINISH, () => {
                this.zone.run(() => {
                  this.playerStateChange.emit(PlayerState.ended);
                });
              });
              soundcloudPlayer.bind(SC.Widget.Events.PLAY_PROGRESS, (event: PlayProgressEvent) => {
                soundcloudPlayer.getDuration((duration) => {
                  this.zone.run(() => {
                    this.progressChange.emit({
                      currentTime: event.currentPosition / 1000,
                      duration: duration / 1000
                    });
                  });
                });
              });
            }
            break;
        }
      });

    // [isPlayerReady$] => playVideo
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
            } else if (videoRequest.playerType === PlayerType.soundcloud) {
              (<SC.Widget.Player>this.playerInfo?.player).load(videoRequest.id, { auto_play: this.autoplay });
            }
          }
        }
      });

    if (!isPlatformServer(this.platformId)) {
      combineLatest([timer(0, 50), this.isPlayerReady$, this.isSwitchingVideo$])
        .pipe(filter(([time, isPlayerReady, isSwitchingVideo]) => {
          return isPlayerReady && !isSwitchingVideo;
        }))
        .pipe(takeUntil(this.destroyed$))
        .subscribe(async ([time, isPlayerReady, isSwitchingVideo]) => {
          let newCurrentTime: number | null = null;
          let newVolume: number | null = null;
          let newIsMuted: boolean = false;
          let duration: number = 0;

          switch (this.playerInfo?.type) {
            case PlayerType.youtube: {
              let player = <YT.Player>this.playerInfo.player;
              if (player.getCurrentTime !== undefined) {
                newCurrentTime = player.getCurrentTime();
              }
              if (player.getVolume !== undefined) {
                newVolume = player.getVolume();
              }
              if (player.isMuted !== undefined) {
                newIsMuted = player.isMuted();
              }
              if (player.getDuration !== undefined) {
                duration = player.getDuration();
              }
            } break;
            case PlayerType.dailymotion: {
              let player = <DM.Player>this.playerInfo.player;
              if (player.currentTime !== undefined) {
                newCurrentTime = player.currentTime;
              }
              if (player.volume !== undefined) {
                newVolume = player.volume * 100;
              }
              if (player.muted !== undefined) {
                newIsMuted = player.muted;
              }
              duration = player.duration;
            } break;
            case PlayerType.vimeo: {
              let player = <Vimeo.Player>this.playerInfo.player;
              if (player.getMuted !== undefined) {
                newIsMuted = await player.getMuted();
              }
            } break;
            case PlayerType.soundcloud: {
              let player = <SC.Widget.Player>this.playerInfo.player;
              if (player.getVolume !== undefined) {
                newVolume = await new Promise<number>((resolve, reject) => {
                  player.getVolume((volume) => {
                    resolve(volume);
                  });
                });
              }
            } break;
          }

          this.zone.run(() => {
            if ((newCurrentTime !== null) && (this._currentTime !== newCurrentTime)) {
              this.progressChange.emit({
                currentTime: this._currentTime = newCurrentTime,
                duration: duration
              });
            }
            if ((newVolume !== null) && (this._volume !== newVolume)) {
              this.volumeChange.emit(this._volume = newVolume);
            }
            if (this._mute != newIsMuted) {
              this.muteChange.emit(this._mute = newIsMuted);
            }
          });
        });
    }
  }

  private destroyCurrentPlayer() {
    switch (this.playerInfo?.type) {
      case PlayerType.youtube:
        (<YT.Player>this.playerInfo.player).destroy();
        break;
      case PlayerType.dailymotion:
        // (<DM.Player>this.playerInfo.player).destroy();
        break;
      case PlayerType.vimeo:
        (<Vimeo.Player>this.playerInfo.player).destroy();
        break;
      case PlayerType.soundcloud:
        // (<SC.Widget.Player>this.playerInfo.player).destroy();
        break;
    }
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
        case PlayerType.vimeo: {
          let iframe = this.container.nativeElement.querySelector<HTMLIFrameElement>('div iframe');
          if (!!iframe) {
            iframe.width = String(value);
          }
        } break;
        case PlayerType.soundcloud: {
          let iframe = this.container.nativeElement.querySelector<HTMLIFrameElement>('iframe');
          if (!!iframe) {
            iframe.width = String(value);
          }
        } break;
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
        case PlayerType.vimeo: {
          let iframe = this.container.nativeElement.querySelector<HTMLIFrameElement>('div iframe');
          if (!!iframe) {
            iframe.height = String(value);
          }
        } break;
        case PlayerType.soundcloud: {
          let iframe = this.container.nativeElement.querySelector<HTMLIFrameElement>('iframe');
          if (!!iframe) {
            iframe.height = String(value);
          }
        } break;
      }
    }
  }
  //#endregion
  //#region currentTime
  private _currentTime: number = 0;
  get currentTime() {
    return this._currentTime;
  }
  @Output() public progressChange = new EventEmitter<PlayerProgress>();
  //#endregion
  //#region seek
  public seek(timestamp: number) {
    if (this._currentTime !== timestamp) {
      this._currentTime = timestamp;
      switch (this.playerInfo?.type) {
        case PlayerType.youtube:
          (<YT.Player>this.playerInfo.player).seekTo(timestamp, true);
          break;
        case PlayerType.dailymotion:
          (<DM.Player>this.playerInfo.player).seek(timestamp);
          break;
        case PlayerType.vimeo:
          (<Vimeo.Player>this.playerInfo.player).setCurrentTime(timestamp);
          break;
        case PlayerType.soundcloud:
          (<SC.Widget.Player>this.playerInfo.player).seekTo(timestamp * 1000);
          break;
      }
    }
  }
  //#endregion
  //#region playerState
  public async getplayerState() {
    switch (this.playerInfo?.type) {
      case PlayerType.youtube: {

        let player = <YT.Player>this.playerInfo.player;
        switch (player.getPlayerState()) {
          case YT.PlayerState.PLAYING:
            return PlayerState.playing;
          case YT.PlayerState.PAUSED:
            return PlayerState.paused;
          case YT.PlayerState.ENDED:
            return PlayerState.ended;
          default:
            return PlayerState.unstarted;
        }

      }
      case PlayerType.dailymotion: {

        let player = <DM.Player>this.playerInfo.player;
        if (!!player.ended) {
          return PlayerState.ended;
        } else if (!!player.paused) {
          return PlayerState.paused;
        } else {
          return PlayerState.playing;
        }

      }
      case PlayerType.vimeo: {

        let player = <Vimeo.Player>this.playerInfo.player;
        if (await player.getEnded()) {
          return PlayerState.ended;
        } else if (await player.getPaused()) {
          return PlayerState.paused;
        } else {
          return PlayerState.playing;
        }

      }
      case PlayerType.soundcloud: {

        let player = <SC.Widget.Player>this.playerInfo.player;
        let isPaused = await new Promise<boolean>((resolve, reject) => {
          player.isPaused((paused) => {
            resolve(paused);
          });
        });

        if (isPaused) {
          return PlayerState.paused;
        } else {
          return PlayerState.playing;
        }

      }
      default: {

        throw `Player type ${this.playerInfo?.type} not supported`;

      }
    }
  }
  @Input() set playerState(value: PlayerState) {
    switch (this.playerInfo?.type) {
      case PlayerType.youtube: {

        let player = <YT.Player>this.playerInfo.player;
        switch (value) {
          case PlayerState.playing:
            player.playVideo();
            break;
          case PlayerState.paused:
            player.pauseVideo();
            break;
          case PlayerState.ended:
            player.stopVideo();
            break;
          case PlayerState.unstarted:
            break;
        }

      } break;
      case PlayerType.dailymotion: {

        let player = <DM.Player>this.playerInfo.player;
        switch (value) {
          case PlayerState.playing:
            player.play();
            break;
          case PlayerState.paused:
            player.pause();
            break;
          case PlayerState.ended:
          case PlayerState.unstarted:
            break;
        }

      } break;
      case PlayerType.vimeo: {

        let player = <Vimeo.Player>this.playerInfo.player;
        switch (value) {
          case PlayerState.playing:
            player.play();
            break;
          case PlayerState.paused:
            player.pause();
            break;
          case PlayerState.ended:
          case PlayerState.unstarted:
            break;
        }

      } break;
      case PlayerType.soundcloud: {
        if (!this.isSwitchingVideo$.value) {
          let player = <SC.Widget.Player>this.playerInfo.player;
          switch (value) {
            case PlayerState.playing:
              player.play();
              break;
            case PlayerState.paused:
              player.pause();
              break;
            case PlayerState.ended:
            case PlayerState.unstarted:
              break;
          }
        }

      } break;
    }
  }
  @Output() public playerStateChange = new EventEmitter<PlayerState>();
  //#endregion
  //#region volume
  private _volume: number = 0;
  get volume() {
    return this._volume;
  }
  @Input() set volume(value: number) {
    this._volume = value;
    switch (this.playerInfo?.type) {
      case PlayerType.youtube: {
        (<YT.Player>this.playerInfo.player).setVolume(value);
      } break;
      case PlayerType.dailymotion: {
        (<DM.Player>this.playerInfo.player).setVolume(value / 100);
      } break;
      case PlayerType.vimeo: {
        (<Vimeo.Player>this.playerInfo.player).setVolume(value / 100);
      } break;
      case PlayerType.soundcloud: {
        (<SC.Widget.Player>this.playerInfo.player).setVolume(value);
      } break;
    }
  }
  @Output() public volumeChange = new EventEmitter<number>();
  //#endregion
  //#region mute
  private _mute: boolean = false;
  get mute() {
    return this._mute;
  }
  @Input() set mute(value: boolean) {
    this._mute = value;
    switch (this.playerInfo?.type) {
      case PlayerType.youtube: {
        if (value) {
          (<YT.Player>this.playerInfo.player).mute();
        } else {
          (<YT.Player>this.playerInfo.player).unMute();
        }
      } break;
      case PlayerType.dailymotion: {
        (<DM.Player>this.playerInfo.player).muted = value;
      } break;
      case PlayerType.vimeo: {
        (<Vimeo.Player>this.playerInfo.player).setMuted(value);
      } break;
    }
  }
  @Output() public muteChange = new EventEmitter<boolean>();
  //#endregion

  // //#region isPip
  // private _isPip: boolean = false;
  // get isPip() {
  //   return this._isPip;
  // }
  // @Input() set isPip(value: boolean) {
  //   this._isPip = value;
  //   switch (this.playerInfo?.type) {
  //     case PlayerType.youtube: {
  //       if (value) {
  //         throw 'YouTube does not support PiP mode';  
  //       }
  //     } break;
  //     case PlayerType.dailymotion: {
  //       if (value) {
  //         throw 'DailyMotion does not support PiP mode';  
  //       }
  //     } break;
  //     case PlayerType.vimeo: {
  //       if (value) {
  //         setTimeout(() => {
  //           console.log('request pip');
  //           (<Vimeo.Player>this.playerInfo?.player).requestPictureInPicture();
  //         }, 50);
  //       } else {
  //         (<Vimeo.Player>this.playerInfo.player).exitPictureInPicture();
  //       }
  //     } break;
  //   }
  // }
  @Output() public isPipChange = new EventEmitter<boolean>();
  public getIsPip() {
    switch (this.playerInfo?.type) {
      case PlayerType.youtube:
        return false
      case PlayerType.dailymotion:
        return false;
      case PlayerType.vimeo: {
        let player = <Vimeo.Player>this.playerInfo?.player;
        return player.getPictureInPicture();
      }
      default:
        return false;
    }
  }
  public async setIsPip(isPip: boolean) {
    // Vimeo pip requests must originate from a user gesture.
    // Hence why we can't make it a bindable property.
    // Sadly, even with this approach, the browser seems to think the event wasn't user initiated when the iframe isn't focused.
    switch (this.playerInfo?.type) {
      case PlayerType.youtube: {
        if (isPip) {
          throw 'YouTube does not support PiP mode';
        }
      } break;
      case PlayerType.dailymotion: {
        if (isPip) {
          throw 'DailyMotion does not support PiP mode';
        }
      } break;
      case PlayerType.vimeo: {
        if (isPip) {
          await (<Vimeo.Player>this.playerInfo?.player).requestPictureInPicture();
        } else {
          await (<Vimeo.Player>this.playerInfo.player).exitPictureInPicture();
        }
      } break;
      case PlayerType.soundcloud: {
        if (isPip) {
          throw 'SoundCloud does not support PiP mode';
        }
      } break;
    }
  }
  //#endregion
  @Input() public autoplay: boolean = true;
  //#region url
  @Input() public set url(value: string) {
    this.setUrl(value);
  }
  public setUrl(url: string | null) {
    console.log('set url');
    if ((typeof url === 'undefined') || (url === null) || (url === '')) {
      this.videoRequest$.next(null);
    } else {
      this.isSwitchingVideo$.next(true);

      let platformWithId = this.playerTypeFinder.getPlatformWithId(url);
      if (platformWithId === null) {
        throw `No player found for url ${url}`;
      } else {
        console.log('platformWithId', platformWithId);
        this.videoRequest$.next({ playerType: platformWithId.platform, id: platformWithId.id });
      }
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
  private isSwitchingVideo$ = new BehaviorSubject<boolean>(false);

  private playerInfo: { type: PlayerType, player: YT.Player | DM.Player | Vimeo.Player | SC.Widget.Player } | null = null;
  private hasJustLoaded: boolean = false;

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
