import '../sass/style.scss';

import { $, $$ } from './modules/bling';
import autocomplete from './modules/autocomplete';
import typeAhead from './modules/typeAhead';
import makeMap from './modules/map';
import ajaxHeart from './modules/heart';

autocomplete($('#address'), $('#lat'), $('#lng'));

typeAhead( $('.search') );

makeMap( $('#map') );

const heartForms = $$('form.heart') // every form with a class of heart
heartForms.on('submit', ajaxHeart);
