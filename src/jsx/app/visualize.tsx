/*
 * Copyright 2019 Google LLC. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {APIProvider, Map, InfoWindow, useMap, useApiIsLoaded, AdvancedMarker, useAdvancedMarkerRef} from '@vis.gl/react-google-maps';
import { createRoot } from 'react-dom/client';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import * as Sentry from "@sentry/react"

interface Location {
  Time : Date;
  RouteName?: string
  RouteNumber: string
  Latitude : string;
  Longitude : string;
}
interface AQILocation {
    Time : Date;
    Model : string;
    AQI: number;
    Latitude : string;
    Longitude : string;  
}

type RandoplanResults = {
    locations: Location[];
    type: 'randoplan'
}

type AQIResults = {
    locations: AQILocation[];
    type: 'aqi'
}
type Results = RandoplanResults | AQIResults;

import garminModelsData from "../../data/garminDeviceLookup.json";
  
  // Define a type alias for the object with index signature
  type GarminModels = {
    [key: string]: string;
  };
  
  // Cast the imported data to the defined type
  const garminModels: GarminModels = garminModelsData;

let script = document.scripts[document.scripts.length-1]
const maps_key = script?.getAttribute('maps_key');        

function makeBounds(locations : Location[]|AQILocation[]): google.maps.LatLngBounds {
    let bounds = new google.maps.LatLngBounds();
    locations.filter(location => location.Latitude != "0.0" && location.Latitude != "0" 
    && location.Latitude != "0.000000" && parseFloat(location.Latitude) < 179.9999 && location.Latitude!="180.000000").forEach ( location => {
      let coords = new google.maps.LatLng({ lat: parseFloat(location.Latitude), lng: parseFloat(location.Longitude) })
      bounds.extend(coords);
    })
    return bounds;
}

  const MarkerWithInfoWindow = ({location} : {location : Location}) : React.JSX.Element => {
    // `markerRef` and `marker` are needed to establish the connection between
    // the marker and infowindow (if you're using the Marker component, you
    // can use the `useMarkerRef` hook instead).
    const [markerRef, marker] = useAdvancedMarkerRef();
  
    const [infoWindowShown, setInfoWindowShown] = useState(false);
  
    // clicking the marker will toggle the infowindow
    const handleMarkerClick = useCallback(
      () => setInfoWindowShown(isShown => !isShown),
      []
    );
  
    // if the maps api closes the infowindow, we have to synchronize our state
    const handleClose = useCallback(() => setInfoWindowShown(false), []);
  
    return (
      <>
        <AdvancedMarker
          ref={markerRef}
          position={{ lat: parseFloat(location.Latitude), lng: parseFloat(location.Longitude) }}
          title={location.RouteNumber === 'undefined' ? location.RouteName : `${location.RouteName}/${location.RouteNumber}`}
          onClick={handleMarkerClick}
        />
  
        {infoWindowShown && location.RouteNumber && (
          <InfoWindow anchor={marker} onClose={handleClose}>
            <iframe src={`https://ridewithgps.com/embeds?type=route&id=${location.RouteNumber}&sampleGraph=true`}
                width={'700px'} height={'700px'}></iframe>            
          </InfoWindow>
        )}
      </>
    );
  };

const Markers = ({ locations }: { locations: Results }) => {
    return (
        locations.type === 'randoplan' ?
            (
                locations.locations.
                    filter(location => location.Latitude != "0.0" && location.Latitude != "0" && parseFloat(location.Latitude) < 179.9999 &&
                        location.Latitude != "0.000000" && location.Latitude != "180.000000").
                    map((location, index) =>
                        <MarkerWithInfoWindow
                            location={location}
                            key={index}
                        >
                        </MarkerWithInfoWindow>
                    )
            ) :
            (
                locations.locations.
                    filter(location => location.Latitude != "0.0" && location.Latitude != "0" && parseFloat(location.Latitude) < 179.9999 &&
                        location.Latitude != "0.000000" && location.Latitude != "180.000000").
                    map((location, index) =>
                        <AdvancedMarker
                            position={{ lat: parseFloat(location.Latitude), lng: parseFloat(location.Longitude) }}
                            key={index}
                            title={garminModels[location.Model] + '/ AQI: ' + location.AQI}
                        >
                        </AdvancedMarker>
                    )
            )
    )
}

const BoundSetter = ({mapBounds} : {mapBounds:google.maps.LatLngBounds|null}) => {
    const map = useMap()

    useEffect(() => {
        if (map && mapBounds) {
            map.fitBounds(mapBounds, 40)
        }
    }, [map, mapBounds])

    return <div/>
}

const MapMaker = ({maps_key} : {maps_key: string}) => {
    const [isMapApiReady, setIsMapApiReady] = useState(false)
    const [visits, setVisits] = useState<Results>({type:'randoplan',locations:[]})
    const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds|null>(null)
    const [viewingRandoplan, setViewingRandoplan]= useState<boolean>(true)

    const toggleMap = () => {
        setViewingRandoplan(!viewingRandoplan)
        setVisits({type:'randoplan',locations:[]})
    }
    
    const handleApiLoad = () => {
        setIsMapApiReady(true)
    }

    const handleApiError = (error: unknown) => {
        Sentry.captureException(error, {tags: {where:'Google Maps API Load Error'}})
        setIsMapApiReady(false)
    }

    useEffect(() => {
        const getUsage = async () => {
            if (visits.locations.length === 0) {
                const visitData =
                    await axios.get(viewingRandoplan ? '/dbquery' : 'https://aqi-gateway.herokuapp.com/dbquery');
                setVisits({type:viewingRandoplan?'randoplan':'aqi', locations:visitData.data})
            }
        }
        getUsage()
    }, [viewingRandoplan])

    useEffect(() => {
        if (!isMapApiReady) {
            return
        }
        if (visits.locations.length > 0) {
            const computedBounds = makeBounds(visits.locations)
            setMapBounds(computedBounds)                
        }
    }, [isMapApiReady,visits])

    const buttonText = viewingRandoplan ? "View AQI data field usage" : "View Randoplan usage"

    return (
        <APIProvider apiKey={maps_key} onLoad={handleApiLoad} onError={handleApiError}>
            {isMapApiReady ? (
                <>
                    <button onClick={toggleMap}>{buttonText}</button>
                    <BoundSetter mapBounds={mapBounds} />
                    <Map
                        mapTypeId={'roadmap'}
                        mapId={"11147ffcb9b103dc"}
                        zoom={mapBounds ? undefined : 2}
                        center={mapBounds ? undefined : { lat: 37.322105867408546, lng: -122.01863576804219 }}
                        defaultBounds={mapBounds ? mapBounds.toJSON() : undefined}
                    >
                        <Markers locations={visits} />
                    </Map>
                </>
            )
                : <div>Initializing map...</div>}
        </APIProvider>
    )
}

const render = () => {

    const container = document.getElementById('usage_map')
    if (!container) {
        return (<div>Missing root container for application</div>)
    }
    const maps_key = script.getAttribute('maps_key');

    if (!maps_key) {
        return (<div>Missing required configuration variables</div>)
    }
    const root = createRoot(container);
    root.render(
        <MapMaker maps_key={maps_key}/>
    )
}

render()

/* function initMap(googleMaps): void {
  map = new googleMaps.Map(
    document.getElementById("map") as HTMLElement, {
  });
  addMarkers(map, "https://aqi-gateway.herokuapp.com/dbquery", (visit) => garminModels[visit.Model], (visit) => visit.AQI==="undefined"?"":visit.AQI, (visit, marker, map) => {});
  randoplan_map = new googleMaps.Map(
    document.getElementById("rpmap") as HTMLElement, {
  });
} */

import "../../static/vis_style.css"; // required for webpack    