import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="container footer-grid">
        <div>
          <h4>🛍️ ShopEase</h4>
          <p>A college demo e-commerce store built with Angular, Node.js and Express. Cash on Delivery available across India.</p>
        </div>
        <div id="about">
          <h4>About Us</h4>
          <p>We bring everyday essentials, gadgets and fashion to your doorstep at honest prices.</p>
        </div>
        <div id="contact">
          <h4>Contact</h4>
          <p>support&#64;shopease.demo<br />+91 98765 43210<br />Hyderabad, Telangana</p>
        </div>
        <div id="help">
          <h4>Help</h4>
          <p><a routerLink="/my-orders">Track your order</a></p>
          <p><a routerLink="/products">Browse products</a></p>
          <p><a routerLink="/cart">View cart</a></p>
        </div>
        <div>
          <h4>Follow Us</h4>
          <p class="social">
            <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a>
            <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer">X</a>
            <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer">YouTube</a>
          </p>
        </div>
      </div>
      <div class="footer-bottom">© 2026 ShopEase · College project demonstration</div>
    </footer>
  `
})
export class FooterComponent {}
