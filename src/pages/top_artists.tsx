import React from "react";
import useDropdownMenu from "../components/hooks/useDropdownMenu";
import SpotifyCard from "../components/cards/spotify_card";
import { apiRequest, convertArtistData, updatePageCache } from "../funcs";
import Status from "../components/status";
import PageContainer from "../components/page_container";
import { ArtistCardProps, ConfigWrapper } from "../types/stats_types";
import { PLACEHOLDER, LASTFM, SPOTIFY } from "../endpoints";

export const topArtistsReq = async (time_range: string, config: ConfigWrapper) => {
    if (config.CONFIG["use-lastfm"] === true) {
        if (!config.CONFIG["api-key"] || !config.CONFIG["lastfm-user"]) return 300;

        const { ["lastfm-user"]: user, ["api-key"]: key } = config.CONFIG;
        const response = await apiRequest("lastfm", LASTFM.topartists(user, key, time_range));

        if (!response) return 200;

        return await convertArtistData(response.topartists.artist);
    } else {
        const response = await apiRequest("topArtists", SPOTIFY.topartists(time_range));

        if (!response) return 200;

        return response.items.map((artist: any) => {
            const image = artist.images[2]?.url || artist.images[1]?.url || PLACEHOLDER;
            return {
                id: artist.id,
                name: artist.name,
                image,
                uri: artist.uri,
                genres: artist.genres,
            };
        });
    }
};

const ArtistsPage = ({ config }: { config: ConfigWrapper }) => {
    const [topArtists, setTopArtists] = React.useState<ArtistCardProps[] | 100 | 200 | 300>(100);
    const [dropdown, activeOption, setActiveOption] = useDropdownMenu(
        ["short_term", "medium_term", "long_term"],
        ["Past Month", "Past 6 Months", "All Time"],
        `top-artists`
    );

    const fetchTopArtists = async (time_range: string, force?: boolean, set: boolean = true) => {
        if (!force) {
            let storedData = Spicetify.LocalStorage.get(`stats:top-artists:${time_range}`);
            if (storedData) return setTopArtists(JSON.parse(storedData));
        }

        const start = window.performance.now();

        const topArtists = await topArtistsReq(time_range, config);
        if (set) setTopArtists(topArtists);
        Spicetify.LocalStorage.set(`stats:top-artists:${time_range}`, JSON.stringify(topArtists));

        console.log("total artists fetch time:", window.performance.now() - start);
    };

    React.useEffect(() => {
        updatePageCache(0, fetchTopArtists, activeOption);
    }, []);

    React.useEffect(() => {
        fetchTopArtists(activeOption);
    }, [activeOption]);

    const props = {
        title: "Top Artists",
        refreshCallback: () => fetchTopArtists(activeOption, true),
        config: config,
        dropdown: dropdown,
    };

    switch (topArtists) {
        case 300:
            return (
                <PageContainer {...props}>
                    <Status icon="error" heading="No API Key or Username" subheading="Please enter these in the settings menu" />
                </PageContainer>
            );
        case 200:
            return (
                <PageContainer {...props}>
                    <Status icon="error" heading="Failed to Fetch Top Artists" subheading="An error occurred while fetching the data" />
                </PageContainer>
            );
        case 100:
            return (
                <PageContainer {...props}>
                    <Status icon="library" heading="Loading" subheading="Fetching data..." />
                </PageContainer>
            );
    }

    const artistCards = topArtists.map((artist, index) => (
        <SpotifyCard
            type={artist.uri.includes("last") ? "lastfm" : "artist"}
            uri={artist.uri}
            header={artist.name}
            subheader={`#${index + 1} Artist`}
            imageUrl={artist.image}
        />
    ));

    return (
        <>
            <PageContainer {...props}>
                <div className={`main-gridContainer-gridContainer stats-grid`}>{artistCards}</div>
            </PageContainer>
        </>
    );
};

export default React.memo(ArtistsPage);
