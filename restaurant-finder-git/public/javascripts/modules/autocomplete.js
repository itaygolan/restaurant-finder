function autocomplete(input, latInput, lngInput) {
  if(!input) return; // skip if there is no input
  const dropdown = new google.maps.places.Autocomplete(input);

  dropdown.addListener('place_changed', () => {
    const place = dropdown.getPlace();
    latInput.value = place.geometry.location.lat();
    lngInput.value = place.geometry.location.lng();
  });
  // if someone hits enter in address field, don't submit forum
  input.on('keydown', (e) => {
    if(e.keycode === 13) {
      e.preventDefault();
    }
  });
}

export default autocomplete;
