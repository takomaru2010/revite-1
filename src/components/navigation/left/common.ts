import { Channel } from "revolt.js";
import { useLayoutEffect } from "preact/hooks";
import { WithDispatcher } from "../../../redux/reducers";
import { Unreads } from "../../../redux/reducers/unreads";
import { HookContext, useForceUpdate } from "../../../context/revoltjs/hooks";

type UnreadProps = WithDispatcher & {
    channel: Channel;
    unreads: Unreads;
}

export function useUnreads({ channel, unreads, dispatcher }: UnreadProps, context?: HookContext) {
    const ctx = useForceUpdate(context);

    useLayoutEffect(() => {
        function checkUnread(target?: Channel) {
            if (!target) return;
            if (target._id !== channel._id) return;
            if (target?.channel_type === "SavedMessages") return;

            const unread = unreads[channel._id]?.last_id;
            if (target.last_message) {
                const message = typeof target.last_message === 'string' ? target.last_message : target.last_message._id;
                if (!unread || (unread && message.localeCompare(unread) > 0)) {
                    dispatcher({
                        type: "UNREADS_MARK_READ",
                        channel: channel._id,
                        message,
                        request: true
                    });
                }
            }
        }

        checkUnread(channel);

        ctx.client.channels.addListener("mutation", checkUnread);
        return () => ctx.client.channels.removeListener("mutation", checkUnread);
    }, [channel, unreads]);
}

export function mapChannelWithUnread(channel: Channel, unreads: Unreads) {
    let last_message_id;
    if (channel.channel_type === 'DirectMessage' || channel.channel_type === 'Group') {
        last_message_id = channel.last_message?._id;
    } else if (channel.channel_type === 'TextChannel') {
        last_message_id = channel.last_message;
    } else {
        return { ...channel, unread: undefined, alertCount: undefined, timestamp: channel._id };
    }

    let unread: 'mention' | 'unread' | undefined;
    let alertCount: undefined | number;
    if (last_message_id && unreads) {
        const u = unreads[channel._id];
        if (u) {
            if (u.mentions && u.mentions.length > 0) {
                alertCount = u.mentions.length;
                unread = 'mention';
            } else if (u.last_id && last_message_id.localeCompare(u.last_id) > 0) {
                unread = 'unread';
            }
        } else {
            unread = 'unread';
        }
    }

    return {
        ...channel,
        timestamp: last_message_id ?? channel._id,
        unread,
        alertCount
    };
}
