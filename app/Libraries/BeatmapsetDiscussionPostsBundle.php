<?php

// Copyright (c) ppy Pty Ltd <contact@ppy.sh>. Licensed under the GNU Affero General Public License v3.0.
// See the LICENCE file in the repository root for full licence text.

namespace App\Libraries;

use App\Models\BeatmapDiscussionPost;
use App\Models\Beatmapset;
use App\Models\User;
use App\Traits\Memoizes;
use App\Transformers\BeatmapDiscussionPostTransformer;
use App\Transformers\BeatmapsetCompactTransformer;
use App\Transformers\UserCompactTransformer;
use Illuminate\Pagination\Paginator;

class BeatmapsetDiscussionPostsBundle extends BeatmapsetDiscussionsBundleBase
{
    use Memoizes;

    public function getData()
    {
        return $this->getPosts();
    }

    public function toArray()
    {
        return [
            'beatmapsets' => json_collection($this->getBeatmapsets(), new BeatmapsetCompactTransformer()),
            'cursor' => $this->getCursor(),
            'posts' => json_collection($this->getPosts(), new BeatmapDiscussionPostTransformer()),
            'users' => json_collection($this->getUsers(), new UserCompactTransformer()),
        ];
    }

    private function getBeatmapsets()
    {
        return $this->memoize(__FUNCTION__, function () {
            return $this->getPosts()->pluck('beatmapDiscussion.beatmapset')->uniqueStrict('id')->values();
        });
    }

    private function getPosts()
    {
        return $this->memoize(__FUNCTION__, function () {
            $this->search = BeatmapDiscussionPost::search($this->params);

            $query = $this->search['query']->with(['user.userGroups', 'beatmapset'])->limit($this->search['params']['limit'] + 1);

            $this->paginator = new Paginator(
                $query->get(),
                $this->search['params']['limit'],
                $this->search['params']['page'],
                [
                    'path' => Paginator::resolveCurrentPath(),
                    'query' => $this->search['params'],
                ]
            );

            return $this->paginator->getCollection();
        });
    }

    private function getUsers()
    {
        return $this->memoize(__FUNCTION__, function () {
            $users = $this->getPosts()
                ->pluck('user')
                ->uniqueStrict('user_id')
                ->values();

            // see note in BeatmapDiscussionVotesBundle
            if (!$this->isModerator) {
                $users = $users->filter(function ($user) {
                    return !$user->isRestricted();
                });
            }

            return $users;
        });
    }
}
