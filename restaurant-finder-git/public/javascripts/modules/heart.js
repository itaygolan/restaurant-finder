import axios from 'axios'
import { $ } from './bling'

// change heart counter and heart color in real time
function ajaxHeart(e) {
  e.preventDefault();
  axios
    // this is the form tag
    .post(this.action) // action is posting to link
    .then(res => {
      const isHearted = this.heart.classList.toggle('heart__button--hearted'); //  form tag has a name attribute of 'heart'
      $('.heart-count').textContent = res.data.hearts.length; // new length of hearts property of new, response data data
      if (isHearted) {
        this.heart.classList.add('heart__button--float');
        setTimeput(() => this.heart.classList.remove('heart__button--float'), 2000);
      }
    })
    .catch(err => console.error(err));
}

export default ajaxHeart;
