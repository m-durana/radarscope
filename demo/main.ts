import { mount } from 'svelte';
import Demo from './Demo.svelte';
import InstrumentsDemo from './InstrumentsDemo.svelte';
import './style.css';

const target = document.getElementById('app');
if (!target) throw new Error('demo target #app not found');

function render() {
  target!.innerHTML = '';
  const route = window.location.hash || '#scope';
  const Component = route.startsWith('#instruments') ? InstrumentsDemo : Demo;
  // Tab bar
  const tabs = document.createElement('nav');
  tabs.style.cssText = 'display:flex;gap:0.5rem;padding:0.6rem 0;border-bottom:1px solid #2a2f38;margin-bottom:0.6rem;';
  const make = (label: string, hash: string) => {
    const a = document.createElement('a');
    a.textContent = label;
    a.href = hash;
    const active = (route || '#scope').startsWith(hash);
    a.style.cssText = `padding:0.3rem 0.7rem;border-radius:4px;text-decoration:none;color:${active ? '#fff' : '#94a3b8'};background:${active ? '#274c77' : 'transparent'};border:1px solid ${active ? '#274c77' : '#2a2f38'};font-size:0.85rem;`;
    return a;
  };
  tabs.appendChild(make('Radar scope', '#scope'));
  tabs.appendChild(make('Instruments', '#instruments'));
  target!.appendChild(tabs);
  const mountTarget = document.createElement('div');
  target!.appendChild(mountTarget);
  mount(Component, { target: mountTarget });
}

window.addEventListener('hashchange', render);
render();
