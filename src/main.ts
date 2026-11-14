import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { semear } from './lib/db';
import { corDaBarra } from './lib/tema.svelte';

navigator.storage?.persist?.();
corDaBarra();
semear().then(() => mount(App, { target: document.getElementById('app')! }));
