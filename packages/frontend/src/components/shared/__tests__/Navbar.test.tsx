import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from '../Navbar';

describe('Navbar Component', () => {
  it('renders the brand title', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByText(/GitMerit/i)).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByText(/How it works/i)).toBeInTheDocument();
    expect(screen.getByText(/What we measure/i)).toBeInTheDocument();
    expect(screen.getByText(/Privacy/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /History/i })).toBeInTheDocument();
  });

  it('does not render auth actions', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.queryByRole('button', { name: /Get Started/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sign In/i })).not.toBeInTheDocument();
  });
});
