// Copyright (c) ppy Pty Ltd <contact@ppy.sh>. Licensed under the GNU Affero General Public License v3.0.
// See the LICENCE file in the repository root for full licence text.

import { BeatmapsetJson } from 'beatmapsets/beatmapset-json';
import BeatmapJson from 'interfaces/beatmap-json';
import GameMode from 'interfaces/game-mode';
import { route } from 'laroute';
import * as React from 'react';
import { group as groupBeatmaps } from 'utils/beatmap-helper';

interface Props {
  beatmapset: BeatmapsetJson;
  onClose: () => void;
}

interface State {
  selectedBeatmapIds: Set<number>;
}

export default class LoveConfirmation extends React.PureComponent<Props, State> {
  private groupedBeatmaps = groupBeatmaps(this.props.beatmapset.beatmaps ?? []);

  constructor(props: Props) {
    super(props);

    this.state = {
      selectedBeatmapIds: new Set(this.props.beatmapset.beatmaps?.map((beatmap) => beatmap.id) ?? []),
    };
  }

  render() {
    return (
      <div className='love-confirmation'>
        <div className='love-confirmation__row love-confirmation__row--title'>
          Choose difficulties to be loved
        </div>

        <div className='love-confirmation__row love-confirmation__row--content'>
          {[...this.groupedBeatmaps].map(([mode, beatmaps]) => this.renderDiffMode(mode, beatmaps))}
        </div>

        <div className='love-confirmation__row love-confirmation__row--footer'>
          <button
            className='btn-osu-big btn-osu-big--rounded-thin'
            onClick={this.love}
            type='button'
          >
            Loved
          </button>

          <button
            className='btn-osu-big btn-osu-big--rounded-thin'
            onClick={this.props.onClose}
            type='button'
          >
            {osu.trans('common.buttons.close')}
          </button>
        </div>
      </div>
    );
  }

  private checkIsModeSelected = (mode: GameMode) => {
    const modeBeatmapIds = this.groupedBeatmaps.get(mode)?.map((beatmap) => beatmap.id) ?? [];
    const isAllSelected = modeBeatmapIds.every((id) => this.state.selectedBeatmapIds.has(id));
    const isAllUnselected = modeBeatmapIds.every((id) => !this.state.selectedBeatmapIds.has(id));

    if (!isAllSelected && !isAllUnselected) {
      return 'indeterminate';
    }

    return isAllSelected;
  };

  private handleCheckboxDifficulty = (e: React.ChangeEvent<HTMLInputElement>) => {
    const beatmapId = parseInt(e.target.value, 10);

    const newSelectedIds = new Set(this.state.selectedBeatmapIds);

    if (this.state.selectedBeatmapIds.has(beatmapId)) {
      newSelectedIds.delete(beatmapId);
    } else {
      newSelectedIds.add(beatmapId);
    }

    this.setState({ selectedBeatmapIds: newSelectedIds });
  };

  private love = () => {
    if (this.state.selectedBeatmapIds.size === 0) {
      return;
    }

    LoadingOverlay.show();

    const url = route('beatmapsets.love', { beatmapset: this.props.beatmapset.id });
    const params = {
      data: { beatmapIds: [...this.state.selectedBeatmapIds] },
      method: 'PUT',
    };

    $.ajax(url, params).done((response) => {
      $.publish('beatmapsetDiscussions:update', { beatmapset: response });
      this.props.onClose();
    }).fail((xhr) => {
      osu.ajaxError(xhr);
    }).always(() => {
      LoadingOverlay.hide();
    });
  };

  private renderDiffMode(mode: GameMode, beatmaps: BeatmapJson[]) {
    if (beatmaps.length === 0) {
      return null;
    }

    return (
      <div key={mode} className='love-confirmation__diff-mode'>
        <div className='love-confirmation__diff-mode-title'>
          <label className='osu-switch-v2'>
            <input
              checked={this.checkIsModeSelected(mode) !== false}
              className='osu-switch-v2__input'
              data-indeterminate={this.checkIsModeSelected(mode) === 'indeterminate'}
              type='checkbox'
              value={mode}
            />
            <span className='osu-switch-v2__content' />
            <div className='love-confirmation__switch-text'>
              {osu.trans(`beatmaps.mode.${mode}`)}
            </div>
          </label>
        </div>
        <ul className='love-confirmation__diff-list'>
          {beatmaps.map((beatmap) => (
            <li
              key={beatmap.id}
              className='love-confirmation__diff-list-item'
            >
              <label className='osu-switch-v2'>
                <input
                  checked={this.state.selectedBeatmapIds.has(beatmap.id)}
                  className='osu-switch-v2__input'
                  onChange={this.handleCheckboxDifficulty}
                  type='checkbox'
                  value={beatmap.id}
                />
                <span className='osu-switch-v2__content' />
                <div className='love-confirmation__switch-text'>
                  {beatmap.version}
                </div>
              </label>
            </li>
          ))}
        </ul>
      </div>
    );
  };
}
