import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './style.css'

// Interface elements
const locationButton = document.querySelector('#location-button')
const radarButton = document.querySelector('#radar-button')
const statusMessage = document.querySelector('#status-message')

// RainViewer endpoint containing the available radar frames
const weatherMapsUrl =
  'https://api.rainviewer.com/public/weather-maps.json'

// Default world-map position
const defaultPosition = [20, 0]
const defaultZoom = 2

// Create the map
const map = L.map('map').setView(defaultPosition, defaultZoom)

// Add the OpenStreetMap base layer
L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
).addTo(map)

// Add a metric scale
L.control
  .scale({
    imperial: false,
  })
  .addTo(map)

// Location-related variables
let locationMarker = null
let accuracyCircle = null
let currentPosition = null

// Radar-related variables
let radarLayer = null
let radarVisible = false

// Button events
locationButton.addEventListener('click', findUserLocation)
radarButton.addEventListener('click', toggleRadar)

/*
  LOCATION FUNCTIONS
*/

function findUserLocation() {
  if (!navigator.geolocation) {
    updateStatus(
      'Pas supporter change ton browser noob.',
      'error',
    )

    return
  }

  locationButton.disabled = true
  locationButton.textContent = 'Jte cherche...'

  updateStatus(
    'Attend...',
    'charge',
  )

  navigator.geolocation.getCurrentPosition(
    handleLocationSuccess,
    handleLocationError,
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
    },
  )
}

function handleLocationSuccess(position) {
  const latitude = position.coords.latitude
  const longitude = position.coords.longitude
  const accuracy = position.coords.accuracy

  currentPosition = {
    latitude,
    longitude,
    accuracy,
  }

  const coordinates = [latitude, longitude]

  // Remove the previous location layers
  if (locationMarker) {
    map.removeLayer(locationMarker)
  }

  if (accuracyCircle) {
    map.removeLayer(accuracyCircle)
  }

  // Add the location point
  locationMarker = L.circleMarker(coordinates, {
    radius: 9,
    fillColor: '#2563eb',
    fillOpacity: 1,
    color: '#ffffff',
    weight: 3,
  }).addTo(map)

  // Add the accuracy circle
  accuracyCircle = L.circle(coordinates, {
    radius: accuracy,
    color: '#2563eb',
    weight: 1,
    fillColor: '#60a5fa',
    fillOpacity: 0.15,
  }).addTo(map)

  locationMarker
    .bindPopup(`
      <strong>Ter ou a peu pres</strong><br>
      Latitude: ${latitude.toFixed(5)}<br>
      Longitude: ${longitude.toFixed(5)}<br>
      Accuracy: about ${Math.round(accuracy)} metres
    `)
    .openPopup()

  // Zoom closely enough to see the detected location
  map.fitBounds(accuracyCircle.getBounds(), {
    padding: [40, 40],
    maxZoom: 16,
  })

  locationButton.disabled = false
  locationButton.textContent = 'Update ouser ke jsuuis?'

  radarButton.disabled = false

  updateStatus(
    `Trouvez a peu pres la a ${Math.round(
      accuracy,
    )} metres.`,
    'success',
  )
}

function handleLocationError(error) {
  locationButton.disabled = false
  locationButton.textContent = 'Accepte osti'

  // Keep radar available if an older location was already found
  radarButton.disabled = currentPosition === null

  let message = 'On ttrouve pas.'

  if (error.code === error.PERMISSION_DENIED) {
    message =
      'Ta pas accepter.'
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    message =
      'Essaye encore check tes settings noob.'
  }

  if (error.code === error.TIMEOUT) {
    message =
      'Trop long essaye encore.'
  }

  updateStatus(message, 'error')
}

/*
  RADAR FUNCTIONS
*/

async function toggleRadar() {
  // Hide the radar when it is already visible
  if (radarVisible) {
    hideRadar()

    return
  }

  // Radar should only be activated after finding a location
  if (!currentPosition) {
    updateStatus(
      'Trouve touer avant le raidor.',
      'error',
    )

    return
  }

  radarButton.disabled = true
  radarButton.textContent = 'Load Raidor...'

  updateStatus(
    'On cherche les derniere majs...',
    'Attend',
  )

  try {
    const response = await fetch(weatherMapsUrl)

    if (!response.ok) {
      throw new Error(`Marche pas: ${response.status}`)
    }

    const radarData = await response.json()
    const frames = radarData?.radar?.past

    if (
      !radarData.host ||
      !Array.isArray(frames) ||
      frames.length === 0
    ) {
      throw new Error('Raidor marche pas dret la.')
    }

    // The final item is the most recent past radar frame
    const latestFrame = frames[frames.length - 1]

    const radarTileUrl =
      `${radarData.host}${latestFrame.path}` +
      '/256/{z}/{x}/{y}/2/1_1.png'

    radarLayer = L.tileLayer(radarTileUrl, {
      tileSize: 256,

      // RainViewer's maximum native tile zoom
      maxNativeZoom: 7,

      // Leaflet can enlarge the tiles beyond their native zoom
      maxZoom: 19,

      opacity: 0.7,

      attribution:
        'Weather radar &copy; ' +
        '<a href="https://www.rainviewer.com/">RainViewer</a>',
    }).addTo(map)

    radarVisible = true

    // Use a regional zoom so surrounding weather is visible
    map.flyTo(
      [
        currentPosition.latitude,
        currentPosition.longitude,
      ],
      7,
      {
        duration: 1,
      },
    )

    const observationTime = formatRadarTime(latestFrame.time)

    radarButton.textContent = 'Cache raidor'

    updateStatus(
      `Mouille tu?: ${observationTime}.`,
      'success',
    )
  } catch (error) {
    console.error('Radar error:', error)

    radarLayer = null
    radarVisible = false
    radarButton.textContent = 'Try radar again'

    updateStatus(
      'Marche pas dret la.',
      'error',
    )
  } finally {
    radarButton.disabled = false
  }
}

function hideRadar() {
  if (radarLayer && map.hasLayer(radarLayer)) {
    map.removeLayer(radarLayer)
  }

  radarLayer = null
  radarVisible = false

  radarButton.textContent = 'Cache pu raidor'

  updateStatus(
    'Raidor cacher.',
    'success',
  )
}

function formatRadarTime(unixTimestamp) {
  const date = new Date(unixTimestamp * 1000)

  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

/*
  SHARED INTERFACE FUNCTION
*/

function updateStatus(message, type) {
  statusMessage.textContent = message
  statusMessage.className =
    `status-message status-${type}`
}