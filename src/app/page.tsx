import { redirect } from 'next/navigation'
import React from 'react'


export default function Dashboard() {
  redirect('/projects')
  return React.Fragment
}
