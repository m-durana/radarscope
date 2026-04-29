import { mount } from 'svelte';
import Demo from './Demo.svelte';
import './style.css';

const target = document.getElementById('app');
if (!target) throw new Error('demo target #app not found');

mount(Demo, { target });
